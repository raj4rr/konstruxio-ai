package ai.konstruxio.service;

import ai.konstruxio.ai.EmbeddingService;
import ai.konstruxio.domain.Entities.*;
import ai.konstruxio.domain.ProjectDocument;
import ai.konstruxio.repo.*;
import ai.konstruxio.security.JwtService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class DemoDataService {
    private final Organizations organizations;
    private final Users users;
    private final Projects projects;
    private final Tasks tasks;
    private final Issues issues;
    private final Reports reports;
    private final DrawingSheets drawingSheets;
    private final DrawingPins drawingPins;
    private final Rfis rfis;
    private final TmTickets tmTickets;
    private final DocumentRepository documents;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final EmbeddingService embeddings;

    public DemoDataService(
        Organizations organizations,
        Users users,
        Projects projects,
        Tasks tasks,
        Issues issues,
        Reports reports,
        DrawingSheets drawingSheets,
        DrawingPins drawingPins,
        Rfis rfis,
        TmTickets tmTickets,
        DocumentRepository documents,
        JdbcTemplate jdbc,
        PasswordEncoder encoder,
        JwtService jwt,
        EmbeddingService embeddings
    ) {
        this.organizations = organizations;
        this.users = users;
        this.projects = projects;
        this.tasks = tasks;
        this.issues = issues;
        this.reports = reports;
        this.drawingSheets = drawingSheets;
        this.drawingPins = drawingPins;
        this.rfis = rfis;
        this.tmTickets = tmTickets;
        this.documents = documents;
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.jwt = jwt;
        this.embeddings = embeddings;
    }

    @Transactional
    public Map<String, Object> seedSampleProject(UUID targetOrgId, UUID targetUserId) {
        Organization org;
        AppUser user;

        Optional<Organization> targetOrgOpt = (targetOrgId != null) ? organizations.findById(targetOrgId) : Optional.empty();
        Optional<AppUser> targetUserOpt = (targetUserId != null) ? users.findById(targetUserId) : Optional.empty();

        if (targetOrgOpt.isPresent() && targetUserOpt.isPresent()) {
            org = targetOrgOpt.get();
            user = targetUserOpt.get();
        } else {
            String demoEmail = "demo@konstruxio.ai";
            Optional<AppUser> existingUser = users.findByEmailIgnoreCase(demoEmail);
            if (existingUser.isPresent()) {
                user = existingUser.get();
                Optional<Organization> existingOrg = organizations.findById(user.organizationId);
                if (existingOrg.isPresent()) {
                    org = existingOrg.get();
                } else {
                    org = organizations.saveAndFlush(new Organization("Konstruxio Construction Group"));
                    user.organizationId = org.id;
                    user = users.saveAndFlush(user);
                }
            } else {
                org = organizations.saveAndFlush(new Organization("Konstruxio Construction Group"));
                user = new AppUser();
                user.organizationId = org.id;
                user.fullName = "Markus Vance (Senior Superintendent)";
                user.email = demoEmail;
                user.passwordHash = encoder.encode("Password123!");
                user.role = "ADMIN";
                user = users.saveAndFlush(user);
            }
        }

        // Check if sample project already exists in this organization
        List<Project> existing = projects.findAllByOrganizationIdOrderByCreatedAtDesc(org.id);
        for (Project p : existing) {
            if ("Skyline Meridian Tower — Phase 2".equalsIgnoreCase(p.name)) {
                String token = jwt.generate(user.id, org.id, user.email, user.role);
                Map<String, Object> projectMap = Map.of(
                    "id", p.id.toString(),
                    "name", p.name,
                    "location", p.location != null ? p.location : "",
                    "status", p.status != null ? p.status : "ACTIVE"
                );
                return Map.of(
                    "token", token,
                    "tokenType", "Bearer",
                    "userId", user.id.toString(),
                    "organizationId", org.id.toString(),
                    "fullName", user.fullName,
                    "email", user.email,
                    "role", user.role,
                    "project", projectMap,
                    "alreadyExisted", true
                );
            }
        }

        // 1. Create Flagship Project
        Project project = new Project();
        project.organizationId = org.id;
        project.name = "Skyline Meridian Tower — Phase 2";
        project.description = "24-story mixed-use commercial & residential tower. Current phase covers core structural pour, Level 2-8 MEP rough-in, and exterior envelope curtainwall.";
        project.location = "Munich City Center (Bavaria)";
        project.status = "ACTIVE";
        project.startDate = LocalDate.now().minusMonths(3);
        project.endDate = LocalDate.now().plusMonths(14);
        project.latitude = 48.137154;
        project.longitude = 11.576124;
        project.weatherNotes = "Automated sensor telemetry linked to Munich city center tower coordinates.";
        project.createdBy = user.id;
        project = projects.saveAndFlush(project);

        // 2. Realistic Schedule Tasks
        createTask(org.id, project.id, user.id, "Level 2 Slab Post-Tensioning & Core Pour",
            "Complete rebar placement, tension cables verification, and 350m³ C35/45 concrete pour.", "HIGH", "DONE", LocalDate.now().minusDays(3));
        createTask(org.id, project.id, user.id, "MEP Riser Coordination & Fire Damper Inspection",
            "Pressure test vertical plumbing stacks and inspect fire dampers at Level 2-4 floor penetrations.", "CRITICAL", "IN_PROGRESS", LocalDate.now().plusDays(2));
        createTask(org.id, project.id, user.id, "Curtainwall Mullion Alignment — North Elevation",
            "Verify thermal break placement and torque structural anchor bolts to 120 Nm.", "HIGH", "IN_PROGRESS", LocalDate.now().plusDays(4));
        createTask(org.id, project.id, user.id, "Drywall Stud Framing — Conference Suites 201-204",
            "75mm acoustic metal stud installation with resilient channel isolation per drawing A-201.", "MEDIUM", "TODO", LocalDate.now().plusDays(7));
        createTask(org.id, project.id, user.id, "Primary Electrical Switchgear Delivery & Rigging",
            "Offload 400kVA transformer from heavy hauler; rig into basement electrical vault.", "HIGH", "TODO", LocalDate.now().plusDays(10));
        createTask(org.id, project.id, user.id, "Stairwell B Fire Escape Pressurization Test",
            "Smoke test emergency exit airflow and certify 50 Pa positive pressure differential.", "LOW", "TODO", LocalDate.now().plusDays(14));

        // 3. Realistic Site Issues / Defects
        createIssue(org.id, project.id, user.id,
            "Missing Firestop Intumescent Collar around 4\" PVC Drain",
            "Through-penetration in 2-hour rated fire separation wall near elevator core is unsealed.",
            "CRITICAL", "OPEN", "Safety", "Elevator Shaft Level 2",
            "Install Hilti CP 643N intumescent firestop collar with smoke seal to restore 2-hour rating per UL System W-L-2128.",
            "/inspections/firestop-penetration.svg");

        createIssue(org.id, project.id, user.id,
            "Conduit Tray Clashing with 600mm HVAC Supply Duct",
            "Primary cable tray elevation +2.85m collides with supply air drop at intersection corridor.",
            "HIGH", "OPEN", "Electrical", "Main Corridor Grid C-4",
            "Lower cable tray bracket by 150mm using trapeze hanger drop rods or request mechanical offset.",
            "/inspections/conduit-duct-clash.svg");

        createIssue(org.id, project.id, user.id,
            "Damaged Steel Door Frame Buck — Office 201",
            "Bottom anchor on steel buck bent during drywall cart delivery transport.",
            "MEDIUM", "RESOLVED", "Finishes", "Office 201 Entry",
            "Weld replacement expansion anchor, shim, and re-grout steel frame buck before hanging leaf.",
            "/inspections/door-frame-buck.svg");

        createIssue(org.id, project.id, user.id,
            "Water Ponding on Temporary Protection Membrane",
            "Inadequate drainage slope on Level 3 exposed slab edge after yesterday's rain shower.",
            "MEDIUM", "OPEN", "Structural", "Level 3 Balcony Deck",
            "Squeegee standing water immediately to prevent efflorescence and slip hazards; clear scupper drains.",
            "/inspections/water-ponding.svg");

        // 4. Daily Site Reports (Past 5 Days)
        createReport(org.id, project.id, user.id, LocalDate.now(),
            "Overcast, 14°C, Wind 18 km/h", 34,
            "Completed conduit pull for Level 2 lighting circuits. Formwork stripped on Stairwell B walls. Glazing team installed 14 glass panels on east facade.",
            "Awaiting municipal inspector sign-off on Level 2 pre-pour rebar inspection.",
            "12 pallets 5/8\" Type X drywall delivered by Knauf. 2 crates Cat6A plenum cable received.",
            "Morning toolbox talk on fall protection and 100% tie-off near leading edges. All safety harnesses inspected.");

        createReport(org.id, project.id, user.id, LocalDate.now().minusDays(1),
            "Light Rain, 11°C, Wind 24 km/h", 28,
            "Interior plumbing rough-in continued in restrooms. Electrical team assembled subpanels LP-2A and LP-2B.",
            "Tower crane operations suspended for 2 hours due to wind gusts above 42 km/h (safety protocol compliant).",
            "Ready-mix concrete delivery delayed 45 minutes due to highway traffic.",
            "Wet floor caution cones placed at all building entrance thresholds.");

        createReport(org.id, project.id, user.id, LocalDate.now().minusDays(2),
            "Sunny, 16°C, Wind 10 km/h", 38,
            "Poured 85m³ concrete for column groups C1-C6 on Level 3. MEP coring completed on floor 2.",
            "None. Peak efficiency day with all trades on site.",
            "8 bulk trucks ready-mix C35/45 delivered; test cylinders sampled and logged.",
            "Checked perimeter safety netting along Level 3 slab edge.");

        createReport(org.id, project.id, user.id, LocalDate.now().minusDays(3),
            "Partly Cloudy, 15°C, Wind 12 km/h", 35,
            "Installed HVAC main supply trunk lines along central corridor. Rebar tying on Level 3 slab.",
            "Discrepancy noted between mechanical drawing M-201 and structural beam depth at Grid B-3. RFI-018 drafted.",
            "Galvanized spiral ductwork and dampers received.",
            "Hot work permit issued for welding structural connection plates; fire watch maintained.");

        createReport(org.id, project.id, user.id, LocalDate.now().minusDays(4),
            "Clear, 17°C, Wind 8 km/h", 32,
            "Post-tensioning tendon installation on Level 2 slab. MEP penetrations sleeved and firestop sleeves set.",
            "None.",
            "High-tensile PT strand delivered and stored in dry warehouse.",
            "Pre-shift safety briefing on high-pressure hydraulic jacking equipment safety.");

        // 5. Drawing Sheet & Blueprint Pins
        DrawingSheet sheet = new DrawingSheet();
        sheet.organizationId = org.id;
        sheet.projectId = project.id;
        sheet.title = "Level 2 — Architectural Layout & Partitions";
        sheet.sheetNumber = "A-201";
        sheet.imageUrl = "/blueprint-sample.svg";
        sheet = drawingSheets.saveAndFlush(sheet);

        createPin(org.id, project.id, sheet.id, user.id, 29.5, 21.0,
            "Missing Firestop Intumescent Collar", "ISSUE", "CRITICAL", "OPEN", "Safety",
            "2-hour fire wall penetration unsealed near elevator shaft.");

        createPin(org.id, project.id, sheet.id, user.id, 54.0, 39.0,
            "Conduit Clash with 600mm HVAC Duct", "ISSUE", "HIGH", "OPEN", "Electrical",
            "Main power feeder tray intersects supply air drop at corridor ceiling.");

        createPin(org.id, project.id, sheet.id, user.id, 82.0, 24.5,
            "Damaged Door Frame Anchor", "ISSUE", "MEDIUM", "RESOLVED", "Finishes",
            "Replaced anchor bracket and re-grouted steel frame buck.");

        createPin(org.id, project.id, sheet.id, user.id, 15.5, 19.0,
            "Stairwell B Guardrail Clearance", "SAFETY", "CRITICAL", "OPEN", "Safety",
            "Temporary handrail loosened during formwork delivery; needs reinforcement.");

        createPin(org.id, project.id, sheet.id, user.id, 21.0, 42.0,
            "Verify Riser Pressure Gauge", "TASK", "LOW", "OPEN", "Plumbing",
            "Certify 150 PSI hydrostatic pressure holds for 24 hours.");

        // 5b. KONSTRUXIO Voice RFIs and T&M Extra Work Tickets
        createRfi(org.id, project.id, user.id, "RFI-042",
            "HVAC Duct vs Structural Primary Beam Clash at Grid C-4",
            "Supply air duct (600x400) conflicts with 450mm primary steel flange on Level 2 Grid C-4. Request architect confirmation on whether to transition into twin 250mm low-profile ducts or sleeve beam.",
            "Mechanical & Structural", "HVAC", "Sheet A-201 / Grid C-4",
            "Transition into dual 250mm rectangular ducts under beam soffit with acoustic lining.",
            true, false, "ANSWERED",
            "Approved to transition into twin ducts. Maintain 150mm clearance to parallel electrical cable tray per Spec 015000.");

        createRfi(org.id, project.id, user.id, "RFI-043",
            "Intumescent Collar Specification on 4-Inch PVC Core Penetrations",
            "Spec 078400 mandates intumescent collars on 4-inch PVC penetrations. Confirm approved model for 2-hour rating in electrical riser room.",
            "Fire Protection & Plumbing", "Plumbing", "Sheet A-201 / Electrical Riser Core",
            "Install Hilti CP 643N intumescent collar with CP 25WB+ seal.",
            false, false, "OPEN", null);

        createTmTicket(org.id, project.id, user.id, "TM-108",
            "Emergency Conduit Relocation & 4x 20A Dedicated Drops in Server Room",
            "Requested on-site by Mark Weber (Client Owner Representative) to accommodate upgraded server racks.",
            "Electrical",
            "2 Journeyman Electricians × 4.5 hrs = 9.0 man-hours @ $95/hr ($855.00)",
            "65m 1\" EMT conduit, 4 deep gang boxes, 4 Leviton 20A industrial grade duplex receptacles, mounting hardware ($325.00)",
            1180.00, "APPROVED", "DIGITALLY_SIGNED_MW_20261120", "Mark Weber (Owner Rep)");

        createTmTicket(org.id, project.id, user.id, "TM-109",
            "Additional Concrete Core Drilling for HVAC Low-Profile Transition",
            "Requested by General Superintendent to clear ceiling elevation at Grid C-4.",
            "Concrete & Coring",
            "1 Coring Specialist × 3.0 hrs = 3.0 man-hours @ $110/hr ($330.00)",
            "Diamond core bit wear, slurry containment, firestop sealant ($190.00)",
            520.00, "PENDING_APPROVAL", null, null);

        createPin(org.id, project.id, sheet.id, user.id, 42.0, 35.0,
            "RFI-042: HVAC Duct vs Structural Beam Clash", "RFI", "HIGH", "ANSWERED", "HVAC",
            "Grid C-4 clash. Transition into dual 250mm low-profile ducts approved.");

        createPin(org.id, project.id, sheet.id, user.id, 76.5, 45.0,
            "TM-108: Server Room 4x 20A Drops & Conduit", "TM_TICKET", "MEDIUM", "APPROVED", "Electrical",
            "Client requested extra work. $1,180.00 approved and digitally signed.");

        // 6. Pre-indexed Project Document (Firestopping & Concrete Specs)
        try {
            ProjectDocument doc = new ProjectDocument();
            doc.organizationId = org.id;
            doc.projectId = project.id;
            doc.filename = "Specification_Section_078400_Firestopping_and_Concrete.pdf";
            doc.contentType = "application/pdf";
            doc.fileSize = 48500L;
            doc.uploadedBy = user.id;
            doc = documents.saveAndFlush(doc);

            String chunk1 = "SECTION 078400 - FIRESTOPPING PENETRATIONS. All penetrations through 2-hour fire-resistance rated floor assemblies and elevator core shafts shall be sealed with UL-classified intumescent firestop systems (Hilti CP 643N or equal). Minimum F-rating shall match the wall/floor rating (2 hours). Smoke seals are mandatory on all electrical and PVC conduits exceeding 50mm diameter.";
            String chunk2 = "SECTION 033000 - CAST-IN-PLACE CONCRETE. Level 2 and Level 3 structural slabs and core columns shall be cast with Class C35/45 concrete with minimum 28-day compressive strength of 45 MPa. Curing compound must be applied within 2 hours of screeding. No pours permitted if ambient temperature falls below 2 degrees Celsius or during sustained rainfall.";
            String chunk3 = "SITE LOGISTICS AND CRANE SAFETY PROTOCOLS. Tower cranes operated on the Skyline Meridian site must cease lifting operations when sustained wind speeds exceed 38 km/h or gusts exceed 50 km/h. High-visibility spotters are required for all blind picks into the basement mechanical vault.";

            insertChunk(org.id, project.id, doc.id, 1, 0, chunk1);
            insertChunk(org.id, project.id, doc.id, 2, 1, chunk2);
            insertChunk(org.id, project.id, doc.id, 3, 2, chunk3);
        } catch (Exception ignored) {}

        String token = jwt.generate(user.id, org.id, user.email, user.role);
        Map<String, Object> projectMap = Map.of(
            "id", project.id.toString(),
            "name", project.name,
            "location", project.location != null ? project.location : "",
            "status", project.status != null ? project.status : "ACTIVE"
        );
        return Map.of(
            "token", token,
            "tokenType", "Bearer",
            "userId", user.id.toString(),
            "organizationId", org.id.toString(),
            "fullName", user.fullName,
            "email", user.email,
            "role", user.role,
            "project", projectMap,
            "alreadyExisted", false
        );
    }

    private void insertChunk(UUID orgId, UUID projId, UUID docId, int page, int index, String content) {
        try {
            float[] vector = getDeterministicVector(content);
            try {
                vector = embeddings.embed(content);
            } catch (Exception ignored) {}

            jdbc.update(
                "INSERT INTO document_chunks (organization_id, project_id, document_id, page_number, chunk_index, content, embedding) VALUES (?, ?, ?, ?, ?, ?, CAST(? AS vector))",
                orgId, projId, docId, page, index, content, EmbeddingService.toPgVector(vector)
            );
        } catch (Exception ignored) {}
    }

    private float[] getDeterministicVector(String text) {
        float[] v = new float[768];
        int hash = text.hashCode();
        for (int i = 0; i < 768; i++) {
            v[i] = (float) Math.sin(hash + i * 0.17) * 0.05f;
        }
        return v;
    }

    private void createTask(UUID orgId, UUID projId, UUID userId, String title, String desc, String priority, String status, LocalDate dueDate) {
        Task t = new Task();
        t.organizationId = orgId;
        t.projectId = projId;
        t.title = title;
        t.description = desc;
        t.priority = priority;
        t.status = status;
        t.dueDate = dueDate;
        t.createdBy = userId;
        tasks.save(t);
    }

    private void createIssue(UUID orgId, UUID projId, UUID userId, String title, String desc, String severity, String status, String trade, String loc, String aiSug, String photoData) {
        SiteIssue i = new SiteIssue();
        i.organizationId = orgId;
        i.projectId = projId;
        i.title = title;
        i.description = desc;
        i.severity = severity;
        i.status = status;
        i.trade = trade;
        i.locationReference = loc;
        i.aiSuggestion = aiSug;
        i.photoData = photoData;
        i.reportedBy = userId;
        issues.save(i);
    }

    private void createReport(UUID orgId, UUID projId, UUID userId, LocalDate date, String weather, int workers, String completed, String blockers, String materials, String safety) {
        DailyReport r = new DailyReport();
        r.organizationId = orgId;
        r.projectId = projId;
        r.reportDate = date;
        r.weather = weather;
        r.workersCount = workers;
        r.workCompleted = completed;
        r.blockers = blockers;
        r.materials = materials;
        r.safetyNotes = safety;
        r.createdBy = userId;
        try {
            reports.save(r);
        } catch (Exception ignored) {}
    }

    private void createPin(UUID orgId, UUID projId, UUID drawingId, UUID userId, double x, double y, String title, String type, String severity, String status, String trade, String desc) {
        DrawingPin p = new DrawingPin();
        p.organizationId = orgId;
        p.projectId = projId;
        p.drawingId = drawingId;
        p.xPercent = x;
        p.yPercent = y;
        p.title = title;
        p.pinType = type;
        p.severity = severity;
        p.status = status;
        p.trade = trade;
        p.description = desc;
        p.createdBy = userId;
        drawingPins.save(p);
    }

    private void createRfi(UUID orgId, UUID projId, UUID userId, String number, String title, String question, String discipline, String trade, String drawingRef, String solution, boolean schedule, boolean cost, String status, String response) {
        Rfi r = new Rfi();
        r.organizationId = orgId;
        r.projectId = projId;
        r.rfiNumber = number;
        r.title = title;
        r.question = question;
        r.discipline = discipline;
        r.trade = trade;
        r.drawingReference = drawingRef;
        r.suggestedSolution = solution;
        r.scheduleImpact = schedule;
        r.costImpact = cost;
        r.status = status;
        r.officialResponse = response;
        r.createdBy = userId;
        rfis.save(r);
    }

    private void createTmTicket(UUID orgId, UUID projId, UUID userId, String number, String title, String directive, String trade, String labor, String materials, double cost, String status, String signature, String signer) {
        TmTicket t = new TmTicket();
        t.organizationId = orgId;
        t.projectId = projId;
        t.ticketNumber = number;
        t.title = title;
        t.clientDirective = directive;
        t.trade = trade;
        t.laborHours = labor;
        t.materialsUsed = materials;
        t.estimatedCost = java.math.BigDecimal.valueOf(cost);
        t.status = status;
        t.customerSignature = signature;
        t.signedBy = signer;
        if (signer != null) t.signedAt = java.time.Instant.now().minus(java.time.Duration.ofHours(24));
        t.createdBy = userId;
        tmTickets.save(t);
    }
}
