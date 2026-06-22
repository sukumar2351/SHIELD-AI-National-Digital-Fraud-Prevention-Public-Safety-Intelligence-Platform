import json
from typing import Dict, Any, List, Set
from sqlalchemy.orm import Session
from app import models

class GraphService:
    def add_node(self, db: Session, node_type: str, node_label: str, properties: Dict[str, Any] = None) -> models.GraphNode:
        """
        Registers a graph node.
        """
        existing = db.query(models.GraphNode).filter(
            models.GraphNode.node_type == node_type,
            models.GraphNode.node_label == node_label
        ).first()
        
        if existing:
            if properties:
                existing.properties = json.dumps(properties)
                db.commit()
            return existing

        node = models.GraphNode(
            node_type=node_type,
            node_label=node_label,
            properties=json.dumps(properties or {})
        )
        db.add(node)
        db.commit()
        db.refresh(node)
        return node

    def add_edge(self, db: Session, source_type: str, source_label: str, target_type: str, target_label: str, relation_type: str, properties: Dict[str, Any] = None) -> models.GraphEdge:
        """
        Registers a graph edge between two nodes.
        """
        # Ensure source and target nodes exist
        self.add_node(db, source_type, source_label)
        self.add_node(db, target_type, target_label)

        existing = db.query(models.GraphEdge).filter(
            models.GraphEdge.source_node_type == source_type,
            models.GraphEdge.source_node_label == source_label,
            models.GraphEdge.target_node_type == target_type,
            models.GraphEdge.target_node_label == target_label,
            models.GraphEdge.relation_type == relation_type
        ).first()

        if existing:
            return existing

        edge = models.GraphEdge(
            source_node_type=source_type,
            source_node_label=source_label,
            target_node_type=target_type,
            target_node_label=target_label,
            relation_type=relation_type,
            properties=json.dumps(properties or {})
        )
        db.add(edge)
        db.commit()
        db.refresh(edge)
        return edge

    def ingest_complaint_to_graph(self, db: Session, complaint: models.Complaint) -> None:
        """
        Automatically ingests a complaint and its associated Fraud DNA dimensions into the graph.
        """
        comp_label = f"Ref-{complaint.id}"
        
        # 1. Add Complaint Node
        self.add_node(db, "Complaint", comp_label, {
            "shield_score": complaint.shield_score,
            "threat_level": complaint.threat_level,
            "status": complaint.status
        })

        # 2. Add Victim Node and Link
        if complaint.citizen_name:
            self.add_node(db, "Victim", complaint.citizen_name)
            self.add_edge(db, "Complaint", comp_label, "Victim", complaint.citizen_name, "REPORTED_BY")

        # 3. Handle DNA Dimensions
        if complaint.fraud_dna:
            dna = complaint.fraud_dna
            
            # 3.1 Link to Fraud Family
            if complaint.family_membership:
                fam = complaint.family_membership.family
                self.add_node(db, "Fraud Family", fam.family_code, {
                    "name": fam.name,
                    "scam_type": fam.main_scam_type
                })
                self.add_edge(db, "Complaint", comp_label, "Fraud Family", fam.family_code, "PART_OF_FAMILY")

                # 3.2 Link Family to District (Geo DNA)
                if dna.geo_dna:
                    self.add_node(db, "District", dna.geo_dna)
                    self.add_edge(db, "Fraud Family", fam.family_code, "District", dna.geo_dna, "LOCATED_IN")

            # 3.3 Link Complaint to Phone
            if dna.communication_dna and complaint.citizen_phone:
                self.add_node(db, "Phone", complaint.citizen_phone)
                self.add_edge(db, "Complaint", comp_label, "Phone", complaint.citizen_phone, "USES")

            # 3.4 Link Complaint to UPI (Financial DNA)
            if dna.financial_dna:
                # Extract clean UPI if available in payment pattern (e.g. 'UPI (verify@okaxis)' -> 'verify@okaxis')
                upi_val = dna.payment_pattern
                if "upi (" in upi_val.lower():
                    upi_val = upi_val.split("(")[-1].replace(")", "").strip()
                
                self.add_node(db, "UPI", upi_val)
                self.add_edge(db, "Complaint", comp_label, "UPI", upi_val, "TRANSFERRED_TO")

    def get_full_graph(self, db: Session, limit: int = 150) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetches the complete overview of nodes and edges up to a limit.
        """
        nodes = db.query(models.GraphNode).limit(limit).all()
        edges = db.query(models.GraphEdge).limit(limit * 3).all()

        return self._format_graph_data(nodes, edges)

    def get_cluster_by_id(self, db: Session, family_code: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Discovers all complaints, victims, phones, and UPI IDs linked directly to a Fraud Family cluster.
        """
        # Find all edges pointing to this family code
        edges = db.query(models.GraphEdge).filter(
            ((models.GraphEdge.source_node_type == "Fraud Family") & (models.GraphEdge.source_node_label == family_code)) |
            ((models.GraphEdge.target_node_type == "Fraud Family") & (models.GraphEdge.target_node_label == family_code))
        ).all()

        node_keys = set()
        node_keys.add(f"Fraud Family:{family_code}")

        # Gather immediate connections
        for e in edges:
            node_keys.add(f"{e.source_node_type}:{e.source_node_label}")
            node_keys.add(f"{e.target_node_type}:{e.target_node_label}")

        # Perform BFS expansion of radius 1 from connected complaints to discover victims and mule banks
        complaint_labels = [key.split(":")[-1] for key in node_keys if key.startswith("Complaint:")]
        if complaint_labels:
            extra_edges = db.query(models.GraphEdge).filter(
                (models.GraphEdge.source_node_type == "Complaint") & (models.GraphEdge.source_node_label.in_(complaint_labels))
            ).all()
            for ee in extra_edges:
                if ee not in edges:
                    edges.append(ee)
                node_keys.add(f"{ee.source_node_type}:{ee.source_node_label}")
                node_keys.add(f"{ee.target_node_type}:{ee.target_node_label}")

        nodes = []
        for key in node_keys:
            ntype, nlabel = key.split(":", 1)
            node = db.query(models.GraphNode).filter(
                models.GraphNode.node_type == ntype,
                models.GraphNode.node_label == nlabel
            ).first()
            if node:
                nodes.append(node)

        return self._format_graph_data(nodes, edges)

    def get_network_expansion(self, db: Session, node_type: str, node_label: str, radius: int = 2) -> Dict[str, List[Dict[str, Any]]]:
        """
        Graph Expansion Engine. Resolves BFS graph traversal up to a radius parameter.
        """
        visited_nodes: Set[str] = set()
        visited_nodes.add(f"{node_type}:{node_label}")
        
        edges_to_return: List[models.GraphEdge] = []
        queue = [(node_type, node_label, 0)]  # Queue store elements as (type, label, depth)

        while queue:
            curr_type, curr_label, depth = queue.pop(0)
            if depth >= radius:
                continue

            # Query all edges touching this node
            connections = db.query(models.GraphEdge).filter(
                ((models.GraphEdge.source_node_type == curr_type) & (models.GraphEdge.source_node_label == curr_label)) |
                ((models.GraphEdge.target_node_type == curr_type) & (models.GraphEdge.target_node_label == curr_label))
            ).all()

            for edge in connections:
                s_key = f"{edge.source_node_type}:{edge.source_node_label}"
                t_key = f"{edge.target_node_type}:{edge.target_node_label}"

                # Add edge to result list if not already present
                if edge not in edges_to_return:
                    edges_to_return.append(edge)

                # Add neighbor node to queue
                if s_key not in visited_nodes:
                    visited_nodes.add(s_key)
                    queue.append((edge.source_node_type, edge.source_node_label, depth + 1))
                if t_key not in visited_nodes:
                    visited_nodes.add(t_key)
                    queue.append((edge.target_node_type, edge.target_node_label, depth + 1))

        # Query all nodes resolved in visited_nodes
        nodes_to_return = []
        for key in visited_nodes:
            ntype, nlabel = key.split(":", 1)
            node = db.query(models.GraphNode).filter(
                models.GraphNode.node_type == ntype,
                models.GraphNode.node_label == nlabel
            ).first()
            if node:
                nodes_to_return.append(node)

        return self._format_graph_data(nodes_to_return, edges_to_return)

    def get_graph_statistics(self, db: Session) -> Dict[str, Any]:
        """
        Computes Graph Network Analytics.
        - Top Fraud Families (largest clusters)
        - Most Connected Fraudsters (highest out-degree)
        - Most Used UPI IDs (highest in-degree)
        - High Risk Districts
        - Network Density & Cluster Size Distribution
        """
        total_nodes = db.query(models.GraphNode).count()
        total_edges = db.query(models.GraphEdge).count()

        # Network Density Calculation (Edges / Potential Edges)
        density = 0.0
        if total_nodes > 1:
            density = round((2.0 * total_edges) / (total_nodes * (total_nodes - 1)), 4)

        # 1. Top Fraud Families
        # We query the counts of PART_OF_FAMILY edges grouped by target_node_label
        family_counts = {}
        family_edges = db.query(models.GraphEdge).filter(models.GraphEdge.relation_type == "PART_OF_FAMILY").all()
        for fe in family_edges:
            family_counts[fe.target_node_label] = family_counts.get(fe.target_node_label, 0) + 1
        top_families = sorted([{"family": k, "complaints_count": v} for k, v in family_counts.items()],
                              key=lambda x: x["complaints_count"], reverse=True)[:5]

        # 2. Most Connected Fraudsters
        fraudster_counts = {}
        owns_edges = db.query(models.GraphEdge).filter(
            (models.GraphEdge.source_node_type == "Fraudster") & (models.GraphEdge.relation_type == "OWNS")
        ).all()
        for oe in owns_edges:
            fraudster_counts[oe.source_node_label] = fraudster_counts.get(oe.source_node_label, 0) + 1
        top_fraudsters = sorted([{"fraudster": k, "infrastructure_count": v} for k, v in fraudster_counts.items()],
                                key=lambda x: x["infrastructure_count"], reverse=True)[:5]

        # 3. Most Used UPI IDs
        upi_counts = {}
        linked_upis = db.query(models.GraphEdge).filter(
            (models.GraphEdge.target_node_type == "UPI") & (models.GraphEdge.relation_type == "LINKED_TO")
        ).all()
        for lu in linked_upis:
            upi_counts[lu.target_node_label] = upi_counts.get(lu.target_node_label, 0) + 1
        top_upis = sorted([{"upi": k, "links_count": v} for k, v in upi_counts.items()],
                          key=lambda x: x["links_count"], reverse=True)[:5]

        # 4. High Risk Districts
        district_counts = {}
        district_edges = db.query(models.GraphEdge).filter(
            (models.GraphEdge.target_node_type == "District") & (models.GraphEdge.relation_type == "LINKED_TO")
        ).all()
        for de in district_edges:
            district_counts[de.target_node_label] = district_counts.get(de.target_node_label, 0) + 1
        top_districts = sorted([{"district": k, "cluster_count": v} for k, v in district_counts.items()],
                               key=lambda x: x["cluster_count"], reverse=True)[:5]

        return {
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "network_density": density,
            "top_families": top_families,
            "top_fraudsters": top_fraudsters,
            "top_upis": top_upis,
            "top_districts": top_districts
        }

    def _format_graph_data(self, nodes: List[models.GraphNode], edges: List[models.GraphEdge]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Helper method to format SQLAlchemy models into visualization JSON structure.
        """
        formatted_nodes = []
        for n in nodes:
            props = {}
            if n.properties:
                try:
                    props = json.loads(n.properties)
                except:
                    pass
            formatted_nodes.append({
                "id": f"{n.node_type}:{n.node_label}",
                "label": n.node_label,
                "type": n.node_type,
                "properties": props
            })

        formatted_edges = []
        for e in edges:
            props = {}
            if e.properties:
                try:
                    props = json.loads(e.properties)
                except:
                    pass
            formatted_edges.append({
                "id": f"{e.id}",
                "source": f"{e.source_node_type}:{e.source_node_label}",
                "target": f"{e.target_node_type}:{e.target_node_label}",
                "type": e.relation_type,
                "properties": props
            })

        return {
            "nodes": formatted_nodes,
            "edges": formatted_edges
        }

graph_service = GraphService()
