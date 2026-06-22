from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.database import get_db
from app import models, security
from app.services.graph_service import graph_service

router = APIRouter()

@router.get("/overview")
def get_graph_overview(
    limit: int = Query(150, description="Max number of nodes to return"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Returns full node/edge layout for visual cluster exploration.
    """
    return graph_service.get_full_graph(db, limit)

@router.get("/cluster/{family_code}")
def get_family_cluster(
    family_code: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Returns sub-graph representing a specific Fraud Family cluster and its immediate linkages.
    """
    # Verify family exists
    fam = db.query(models.FraudFamily).filter(models.FraudFamily.family_code == family_code).first()
    if not fam:
        raise HTTPException(status_code=404, detail="Fraud family code not found.")
        
    return graph_service.get_cluster_by_id(db, family_code)

@router.get("/network/{node_label}")
def get_node_network(
    node_label: str,
    node_type: str = Query(..., description="Node Type (e.g. Phone, UPI, Victim, Complaint)"),
    radius: int = Query(2, description="Network radius (depth of search)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Performs BFS traversal to find all connected nodes up to the specified radius depth.
    """
    # Verify node exists in graph
    node = db.query(models.GraphNode).filter(
        models.GraphNode.node_type == node_type,
        models.GraphNode.node_label == node_label
    ).first()
    if not node:
        raise HTTPException(status_code=404, detail="Target node not found in graph database.")

    return graph_service.get_network_expansion(db, node_type, node_label, radius)

@router.get("/family/{family_id}")
def get_family_graph(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Returns the sub-graph representing all nodes belonging to the given family ID.
    """
    fam = db.query(models.FraudFamily).filter(models.FraudFamily.id == family_id).first()
    if not fam:
        raise HTTPException(status_code=404, detail="Fraud family ID not found.")
        
    return graph_service.get_cluster_by_id(db, fam.family_code)

@router.get("/statistics")
def get_graph_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Computes graph network analytics: Top families, connected fraudsters, most used UPIs, high-risk districts, network density.
    """
    return graph_service.get_graph_statistics(db)
