# SHIELD AI - Judge Demo Runbook

This runbook guides judges and evaluators through a click-by-click showcase of the SHIELD AI platform capabilities.

---

## Preparation
1. Ensure the backend and frontend are running. Open a browser to `http://localhost:5173`.
2. Login if prompted (Default Credentials: Username `officer_shield`, Password `fios2026`).

---

## Demo 1: Citizen Copilot Simulation (Digital Arrest Scam)
*Goal: Demonstrate how a citizen interacts with the AI Copilot to check a live threat and receive multi-lingual advice.*

1. In the Sidebar, click on **Citizen Copilot**.
2. Locate the **Quick Simulation Prompts** panel at the bottom of the chat panel.
3. Click the button labeled **🚨 Fake CBI customs call**.
4. The simulator automatically types and sends the text simulating a CBI officer video call drug intercept threat.
5. **Observe**:
   - The Copilot replies within 500ms indicating a **Critical Risk** classification.
   - The **Pre-Check Threat Indicators** panel on the right updates instantly showing a **SHIELD Threat Score** of `94/100` and threat category `Critical`.
   - The **Advisory Guidance** explains the digital arrest scam.
   - The **Syndicate Awareness** card details the *CBI Custom Arrest Syndicate* and lists the total number of victims affected.

---

## Demo 2: Localized Safety Advisory
*Goal: Show how Copilot translates safety protocols dynamically into regional Indian languages.*

1. On the **Citizen Copilot** page, locate the **Globe icon** language selector at the top-right.
2. Select **Telugu (తెలుగు)** or **Hindi (हिन्दी)** from the dropdown.
3. Scroll through the **Multi-lingual Safety Tips** list on the bottom right.
4. **Observe**: The tips translation updates dynamically to explain UPI safety and digital arrest prevention in the selected regional language.

---

## Demo 3: Ingesting Complaints (Executive Command Center)
*Goal: Showcase the primary judge dashboard and live threat tracking.*

1. In the Sidebar, click on **Dashboard**.
2. **Observe**:
   - The top row features five metric panels detailing Total Complaints, Active Families, average SHIELD score, Active Cases, and Auto-FIRs compiled.
   - The **Threat Timeline** charts the monthly ingestion rate.
   - The **Fraud Family Distribution** pie chart groups current DNA classifications.
   - The **Live Threat Incidents** logs show the recent critical complaints flowing in.

---

## Demo 4: Fraud DNA Genome Index
*Goal: Inspect specific digital signatures mapped from scam entities.*

1. In the Sidebar, click on **Fraud DNA**.
2. **Observe**:
   - The metrics displaying average match confidence and active syndicate counts.
   - The **Communication & Financial DNA Vectors** bar chart showing Phone Harassment/Skype vs. UPI/Bank Transfers.
   - **Behavioral DNA** showcasing psychological triggers (Fear, Urgency, Greed).
   - In the **Top Fraud Families Table**, search for `CBI` or `Mewat` in the search bar.
   - **Observe**: The list filters instantly to show the active syndicate, its traits (such as SIM cards, UPI, language templates), and its risk score.

---

## Demo 5: Fraud Graph Intelligence
*Goal: Explore link analysis and network nodes correlation.*

1. In the Sidebar, click on **Fraud Graph**.
2. **Observe**:
   - A fully interactive React Flow canvas plotting interconnected nodes (Complaints, Phone Numbers, UPI ids, Victims, Districts, and Fraudsters).
   - Click and drag to **Pan**, and use the scroll wheel to **Zoom**.
3. Locate the **Fraud Family Cluster** dropdown in the right panel and select **DIGITAL_ARREST_2026_001**.
   - **Observe**: The canvas filters to isolate only nodes belonging to the CBI Digital Arrest Syndicate.
4. Click on the central node `Complaint:Ref-499`.
   - **Observe**: All directly connected nodes remain bright while unconnected nodes fade out. The right inspector docket loads the metadata for Ref-499.
5. In the right inspector, click **Expand Connections**.
   - **Observe**: The canvas dynamically queries the backend and expands the node to reveal newly linked burner phones or UPI addresses connected to the fraudster network.
6. Click on a linked phone node and click **Dispatch Freeze Order**. A notification triggers confirming the automated block request dispatched to NPCI nodes.

---

## Demo 6: Autonomous Case Investigation
*Goal: Run the AI Investigator agent on an active case.*

1. In the Sidebar, click on **Investigations**.
2. **Observe**: The **Case Ingestion Queue** lists cases with statuses *Pending*, *Under Investigation*, and *Resolved*.
3. Click on a case marked as **Pending** in the queue.
4. Click the button labeled **Run AI Investigation Now** or **Trigger Agent** in the queue row.
5. **Observe**: The AI agent spins to perform correlation, matching the case description against Fraud DNA signatures, and tracing financial mule nodes. Once done, the status changes to **Analyzed**.

---

## Demo 7: Case Timelines & AI Reasoning Logs
*Goal: Inspect dossier summaries, chronologies, and agent thoughts.*

1. Select a newly analyzed case from the queue.
2. In the right panel, explore the tabs:
   - **Summary**: Read the executive overview and key findings.
   - **Timeline**: Review the step-by-step chronology compiled from the complaint.
   - **AI Process**: View the exact correlation log detailing how the agent connected burner numbers and matched the scam signature to active database syndicates.

---

## Demo 8: Legal Mapping & Auto-FIR Generation
*Goal: Preview and export legally compliant BNS complaint transcripts.*

1. With the analyzed case selected, click on the **FIR Draft** tab.
2. **Observe**:
   - The legal section mappings header (BNS 2023 Section 318 for cheating, and IT Act Section 66D).
   - The compiled draft transcript formatted under the Indian Criminal Procedure Code.
3. In the export format dropdown, select **PDF** or **Word (.docx)**.
4. Click **Download Record**.
   - **Observe**: A download triggers saving the formatted legal transcript file to your local computer.

---

## Demo 9: Geospatial Threat Hotspots Map
*Goal: Verify geospatial district risk calculations and family spread maps.*

1. In the Sidebar, click on **Threat Map**.
2. **Observe**:
   - An interactive coordinate map of India.
   - High-risk target districts like **Jamtara** and **Mewat** are plotted with pulsing red/orange rings.
3. Hover your cursor over the pulsing Jamtara circle.
   - **Observe**: A floating SVG tooltip displays the district name, risk index, and case count.
4. Click on the Jamtara node.
   - **Observe**: The **Selected Hotspot Details** panel on the right updates to show risk score, active cases, total financial losses in rupees, and growth trend line charts.
5. Select a family filter from the **Map Overlay Filters** dropdown.
   - **Observe**: The map overlays only hotspots where the selected syndicate has active operations, demonstrating regional concentration.
6. Scroll through the **Risk Ranking Table** or select a state like **Jharkhand** to filter rankings.
