-- Seed Action Center data for two extra organizations and deactivate
-- every other org so the home page shows data for exactly three:
--   - Vagges Juletræer v/Vagn Ravn Clausen  (already populated)
--   - Vejle Byråd                            (new)
--   - Bright Cloud                           (new)
--
-- Idempotent-ish: re-running will create another batch, so only run once.
-- Wrapped in a single transaction; nothing is committed until the end.

BEGIN;

-- ── Constants ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    -- Org IDs we keep active
    org_vagges     CONSTANT uuid := 'fefb1593-0c4f-4a63-97fa-c4995cdbe19a';
    org_vejle      CONSTANT uuid := 'cc961ac6-50b8-4a8a-be8b-80e77f34488b';
    org_bright     CONSTANT uuid := '06a084ac-cb72-47aa-a6b5-d9a0df90ac2e';

    -- Vejle Byråd profiles (Profile.id) and matching login.id values
    p_vejle_harper   CONSTANT uuid := '1273df87-ac44-498c-96c0-d01b93fb75fc';
    u_vejle_harper   CONSTANT uuid := '1ce85951-05a0-4b6b-b0db-b36768cd439e';
    p_vejle_daniel   CONSTANT uuid := '1e0713df-12e6-4653-8646-8577afae31c2';
    u_vejle_daniel   CONSTANT uuid := '08bae23d-8c96-4f5a-8c6c-9c691cc4361b';
    p_vejle_benjamin CONSTANT uuid := 'b946adb3-3cd4-47fe-a6b9-1b44385f386a';
    u_vejle_benjamin CONSTANT uuid := 'e1e701fc-84c5-4204-a8b9-dfdb752f1739';
    p_vejle_scarlett CONSTANT uuid := '87d8ae12-2b03-4fe8-b4dd-6dae95cb5b93';
    u_vejle_scarlett CONSTANT uuid := '635e889f-3e91-44dd-9751-a6eccfc7c1e3';

    -- Bright Cloud profiles and matching login.id values
    p_bright_harper  CONSTANT uuid := '886e6e34-eee5-440c-99e5-d736ecf1c9b1';
    u_bright_harper  CONSTANT uuid := '0ac1553a-e75e-456d-ac05-a7bc438d6673';
    p_bright_daniel  CONSTANT uuid := 'efed91a2-56d3-4bc9-8566-7768bc700a63';
    u_bright_daniel  CONSTANT uuid := 'c0ed1b59-42a6-4da0-85dc-9d1dba9936f6';
    p_bright_isa     CONSTANT uuid := '4f587c75-5661-4a58-8d47-ac4ddcc0cc54';
    u_bright_isa     CONSTANT uuid := 'a5459538-4e08-48ce-8119-b5e550ac1d3f';
    p_bright_oliver  CONSTANT uuid := '110a26f3-089a-4deb-88f0-e7e568f92769';
    u_bright_oliver  CONSTANT uuid := '5f6a6b14-8a2e-4531-b47d-798ac7911be7';

    -- Per-org task IDs (so we can wire profiles, messages, evidence)
    t_vejle_overdue1   uuid;
    t_vejle_overdue2   uuid;
    t_vejle_overdue3   uuid;
    t_vejle_duesoon1   uuid;
    t_vejle_duesoon2   uuid;
    t_vejle_evidence   uuid;

    t_bright_overdue1  uuid;
    t_bright_overdue2  uuid;
    t_bright_overdue3  uuid;
    t_bright_duesoon1  uuid;
    t_bright_duesoon2  uuid;
    t_bright_evidence  uuid;

    a_vejle_evidence   uuid;
    e_vejle_evidence   uuid;
    a_bright_evidence  uuid;
    e_bright_evidence  uuid;
BEGIN

-- ════════════════════════════════════════════════════════════════════════════
-- VEJLE BYRÅD — tasks
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_vejle, 'Annual GDPR Audit',
     'Carry out the annual GDPR audit of municipal data processing activities.',
     'Signed audit report (PDF)', 'OPEN',
     NOW() - interval '14 days', NOW())
RETURNING id INTO t_vejle_overdue1;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_vejle, 'Update Information Security Policy',
     'Refresh the municipality''s ISMS policy to reflect new NIS2 obligations.',
     'Approved policy document', 'NOT_STARTED',
     NOW() - interval '5 days', NOW())
RETURNING id INTO t_vejle_overdue2;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_vejle, 'Citizen Service Disaster Recovery Drill',
     'Run the half-yearly disaster recovery drill for the citizen service portal.',
     'Drill log + lessons learned report', 'OPEN',
     NOW() - interval '2 days', NOW())
RETURNING id INTO t_vejle_overdue3;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_vejle, 'Quarterly Access Review',
     'Review and re-certify privileged access to council systems.',
     'Signed access review report', 'OPEN',
     NOW() + interval '3 days', NOW())
RETURNING id INTO t_vejle_duesoon1;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_vejle, 'Vendor Risk Assessment — School IT',
     'Complete the third-party risk assessment for the new schools IT supplier.',
     'Risk assessment scoring sheet', 'NOT_STARTED',
     NOW() + interval '6 days', NOW())
RETURNING id INTO t_vejle_duesoon2;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_vejle, 'Submit Phishing Simulation Results',
     'Upload the Q1 phishing simulation report for board review.',
     'Phishing simulation PDF report', 'OPEN',
     NOW() + interval '1 day', NOW())
RETURNING id INTO t_vejle_evidence;

-- Vejle task profile assignments
INSERT INTO task_profile (task_id, profile_id) VALUES
    (t_vejle_overdue1, p_vejle_harper),
    (t_vejle_overdue2, p_vejle_daniel),
    (t_vejle_overdue3, p_vejle_benjamin),
    (t_vejle_duesoon1, p_vejle_scarlett),
    (t_vejle_duesoon2, p_vejle_harper),
    (t_vejle_evidence, p_vejle_daniel);

-- Vejle messages: 2 unread Chat (NOTE/REPLY), 1 unread REQUEST
INSERT INTO message (id, task_id, sender_id, origin, type, content, is_read, updated_at)
VALUES
    (gen_random_uuid(), t_vejle_overdue1, u_vejle_harper, 'USER', 'NOTE',
     'The auditor flagged three open findings from last year — can we discuss tomorrow?',
     false, NOW() - interval '4 hours');

INSERT INTO message (id, task_id, sender_id, origin, type, content, is_read, updated_at)
VALUES
    (gen_random_uuid(), t_vejle_overdue2, u_vejle_daniel, 'USER', 'REPLY',
     'Draft policy is ready for review. Pushed it to the shared folder.',
     false, NOW() - interval '1 hour');

INSERT INTO message (id, task_id, sender_id, origin, type, request_type, content, is_read, updated_at)
VALUES
    (gen_random_uuid(), t_vejle_overdue3, u_vejle_benjamin, 'USER', 'REQUEST', 'POSTPONE',
     'Requesting two-week postponement — facilities team isn''t available before then.',
     false, NOW() - interval '30 minutes');

-- Vejle pending evidence: artifact + evidence + EVIDENCE message
INSERT INTO artifact (id, organization_id, name, type, mime_type, extension, size, original_name, updated_at)
VALUES
    (gen_random_uuid(), org_vejle, 'Phishing Simulation Q1 Report',
     'REPORT', 'application/pdf', 'pdf', '482311',
     'Vejle_Phishing_Q1_Report.pdf', NOW())
RETURNING id INTO a_vejle_evidence;

INSERT INTO evidence (id, organization_id, task_id, artifact_id, created_by, approved, resubmit, updated_at)
VALUES
    (gen_random_uuid(), org_vejle, t_vejle_evidence, a_vejle_evidence,
     p_vejle_daniel, false, false, NOW())
RETURNING id INTO e_vejle_evidence;

INSERT INTO task_artifact (task_id, artifact_id) VALUES
    (t_vejle_evidence, a_vejle_evidence);

INSERT INTO message (id, task_id, sender_id, origin, type, content, evidence_id, is_read, updated_at)
VALUES
    (gen_random_uuid(), t_vejle_evidence, u_vejle_daniel, 'USER', 'EVIDENCE',
     'Uploading the Q1 phishing simulation results — please review and approve.',
     e_vejle_evidence, false, NOW() - interval '20 minutes');


-- ════════════════════════════════════════════════════════════════════════════
-- BRIGHT CLOUD — tasks
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_bright, 'ISO 27001 Stage 1 Audit Prep',
     'Compile the ISMS evidence pack for the Stage 1 certification audit.',
     'Evidence index + supporting documents', 'OPEN',
     NOW() - interval '10 days', NOW())
RETURNING id INTO t_bright_overdue1;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_bright, 'Patch Critical Production Servers',
     'Apply the May security rollup to all production servers in cluster A.',
     'Patch log per host', 'OPEN',
     NOW() - interval '3 days', NOW())
RETURNING id INTO t_bright_overdue2;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_bright, 'Customer Data Inventory Refresh',
     'Re-validate the data inventory of customer-facing SaaS environments.',
     'Updated data inventory spreadsheet', 'NOT_STARTED',
     NOW() - interval '1 day', NOW())
RETURNING id INTO t_bright_overdue3;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_bright, 'Backup Restore Test',
     'Quarterly restore-from-backup test for the customer database.',
     'Restore test log', 'OPEN',
     NOW() + interval '4 days', NOW())
RETURNING id INTO t_bright_duesoon1;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_bright, 'Annual SOC 2 Self-Assessment',
     'Run the internal SOC 2 self-assessment ahead of the external audit.',
     'Self-assessment workbook', 'NOT_STARTED',
     NOW() + interval '7 days', NOW())
RETURNING id INTO t_bright_duesoon2;

INSERT INTO task (id, organization_id, name, description, expected_evidence, status, end_at, updated_at)
VALUES
    (gen_random_uuid(), org_bright, 'Submit Pen Test Report Q1',
     'Submit the external penetration test results for security review.',
     'Pen test PDF report', 'OPEN',
     NOW() + interval '2 days', NOW())
RETURNING id INTO t_bright_evidence;

-- Bright Cloud task profile assignments
INSERT INTO task_profile (task_id, profile_id) VALUES
    (t_bright_overdue1, p_bright_harper),
    (t_bright_overdue2, p_bright_daniel),
    (t_bright_overdue3, p_bright_isa),
    (t_bright_duesoon1, p_bright_oliver),
    (t_bright_duesoon2, p_bright_harper),
    (t_bright_evidence, p_bright_isa);

-- Bright Cloud messages: 2 unread Chat (NOTE/REPLY), 1 unread REQUEST
INSERT INTO message (id, task_id, sender_id, origin, type, content, is_read, updated_at)
VALUES
    (gen_random_uuid(), t_bright_overdue1, u_bright_harper, 'USER', 'NOTE',
     'Auditor wants the access-review evidence packaged separately — can you split it out?',
     false, NOW() - interval '6 hours');

INSERT INTO message (id, task_id, sender_id, origin, type, content, is_read, updated_at)
VALUES
    (gen_random_uuid(), t_bright_overdue2, u_bright_daniel, 'USER', 'REPLY',
     'Patches are scheduled tonight in the maintenance window — will report back tomorrow.',
     false, NOW() - interval '2 hours');

INSERT INTO message (id, task_id, sender_id, origin, type, request_type, content, is_read, updated_at)
VALUES
    (gen_random_uuid(), t_bright_overdue3, u_bright_isa, 'USER', 'REQUEST', 'CLOSE',
     'Inventory was completed last sprint. Requesting we close this task.',
     false, NOW() - interval '45 minutes');

-- Bright Cloud pending evidence: artifact + evidence + EVIDENCE message
INSERT INTO artifact (id, organization_id, name, type, mime_type, extension, size, original_name, updated_at)
VALUES
    (gen_random_uuid(), org_bright, 'Pen Test Report Q1 2026',
     'REPORT', 'application/pdf', 'pdf', '1284912',
     'BrightCloud_PenTest_Q1_2026.pdf', NOW())
RETURNING id INTO a_bright_evidence;

INSERT INTO evidence (id, organization_id, task_id, artifact_id, created_by, approved, resubmit, updated_at)
VALUES
    (gen_random_uuid(), org_bright, t_bright_evidence, a_bright_evidence,
     p_bright_isa, false, false, NOW())
RETURNING id INTO e_bright_evidence;

INSERT INTO task_artifact (task_id, artifact_id) VALUES
    (t_bright_evidence, a_bright_evidence);

INSERT INTO message (id, task_id, sender_id, origin, type, content, evidence_id, is_read, updated_at)
VALUES
    (gen_random_uuid(), t_bright_evidence, u_bright_isa, 'USER', 'EVIDENCE',
     'Q1 pen test report attached — findings summary on page 3. Awaiting approval.',
     e_bright_evidence, false, NOW() - interval '15 minutes');


-- ════════════════════════════════════════════════════════════════════════════
-- Deactivate every org except the three we kept active
-- ════════════════════════════════════════════════════════════════════════════
UPDATE organization
SET    active = false,
       updated_at = NOW()
WHERE  active = true
  AND  id NOT IN (org_vagges, org_vejle, org_bright);

END $$;

COMMIT;
