CREATE USER compliance WITH PASSWORD 'hesteogGrise246';
CREATE DATABASE compliance OWNER compliance;
GRANT ALL PRIVILEGES ON DATABASE compliance TO compliance;

For Prism:
DATABASE_URL="postgresql://compliance:hesteogGrise246@localhost:5432/compliance"
ACCELERATE_URL="prisma+postgres://localhost:51213/?api_key=eyJkYXRhYmFzZVVybCI6InBvc3RncmVzOi8vcG9zdGdyZXM6cG9zdGdyZXNAbG9jYWxob3N0OjUxMjE0L3RlbXBsYXRlMT9zc2xtb2RlPWRpc2FibGUmY29ubmVjdGlvbl9saW1pdD0xJmNvbm5lY3RfdGltZW91dD0wJm1heF9pZGxlX2Nvbm5lY3Rpb25fbGlmZXRpbWU9MCZwb29sX3RpbWVvdXQ9MCZzaW5nbGVfdXNlX2Nvbm5lY3Rpb25zPXRydWUmc29ja2V0X3RpbWVvdXQ9MCIsIm5hbWUiOiJkZWZhdWx0Iiwic2hhZG93RGF0YWJhc2VVcmwiOiJwb3N0Z3JlczovL3Bvc3RncmVzOnBvc3RncmVzQGxvY2FsaG9zdDo1MTIxNS90ZW1wbGF0ZTE_c3NsbW9kZT1kaXNhYmxlJmNvbm5lY3Rpb25fbGltaXQ9MSZjb25uZWN0X3RpbWVvdXQ9MCZtYXhfaWRsZV9jb25uZWN0aW9uX2xpZmV0aW1lPTAmcG9vbF90aW1lb3V0PTAmc2luZ2xlX3VzZV9jb25uZWN0aW9ucz10cnVlJnNvY2tldF90aW1lb3V0PTAifQ"


DATABASE_URL="postgresql://compliance:hesteogGrise246@localhost:5432/compliance?schema=public"



npm install @prisma/client

npx prisma migrate reset
npx prisma db push --force-reset
npx prisma studio
npx prisma generate

FIX AUTO INCREMENT
--------------------
ORGANISATION:
SELECT pg_get_serial_sequence('organization', 'id');

SELECT setval(
  pg_get_serial_sequence('organization', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM organization),
  true
);

Check:
SELECT nextval(pg_get_serial_sequence('organization', 'id'));

--------------------
TASK:
SELECT pg_get_serial_sequence('task', 'id');

SELECT setval(
  pg_get_serial_sequence('task', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM task),
  true
);

Check:
SELECT nextval(pg_get_serial_sequence('task', 'id'));

--------------------
USER:
SELECT pg_get_serial_sequence('login', 'id');

SELECT setval(
  pg_get_serial_sequence('login', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM task),
  true
);

SELECT nextval(pg_get_serial_sequence('login', 'id'));

--------------------
PROFILE:
SELECT pg_get_serial_sequence('profile', 'id');

SELECT setval(
  pg_get_serial_sequence('profile', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM task),
  true
);

SELECT nextval(pg_get_serial_sequence('profile', 'id'));



------------------------------------------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------------------------

insert into settings (application_name, home_directory, created_at, updated_at, active)
Values ('Compliance Circle', '/compliance/', NOW(), NOW(), true);

insert into login (email, role, name, nickname, work_function, password_hash, created_at, updated_at, active)
Values ('rfs@skardhamar.com', 'SUPER_ADMIN', 'Rune Skardhamar', 'Rune', 'DEVELOPER', '$2b$10$ncSCjyAU96eXnVoh0HtPXey6ObQ0G13IXijuqdDs08TVbic.0TJaS', NOW(), NOW(), true);

insert into login (email, role, name, nickname, work_function, password_hash, created_at, updated_at, active)
Values ('', 'USER', 'Preben Elkjær', 'Preben', 'DEVELOPER', '', NOW(), NOW(), true);

insert into organization (name, description, created_at, updated_at, active)
values ('Acme Ltd.', '', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Vejle Byråd', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 1', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 2', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 3', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 4', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 5', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 6', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 7', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 8', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 9', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 10', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 11', NOW(), NOW(), true);

insert into organization (name, created_at, updated_at, active)
Values ('Corp 12', NOW(), NOW(), true);

insert into organization_settings (organization_id, upload_directory, download_directory, artifact_directory, created_at, updated_at, active)
Values (1, 'acme/up', 'acme/down', 'acme/artifact', NOW(), NOW(), true);

insert into profile (organization_id, user_id, name, description, created_at, updated_at, active)
values (1, 1, 'Rune Skardhamar', '', NOW(), NOW(), true);

insert into profile (organization_id, user_id, name, description, created_at, updated_at, active)
values (1, 2, 'Preben Elkjær', '', NOW(), NOW(), true);

insert into task (organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (1, 'Clarify management ownership for IT and cyber risk', 
'Identify and clarify who at management level has overall ownership of IT and cyber risks.',
'Role description, management note, decision record', 
'OPEN',
  NOW(), NOW(), true);

insert into task (organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (1, 'Clarify how management follows up on IT and cyber risks', 
'Clarify how management receives updates and follows up on IT and cyber risks over time.',
'Reporting outline, meeting agenda, follow-up note', 
'OPEN',
  NOW(), NOW(), true);

insert into task (organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (1, 'Clarify decision-making in case of serious incidents', 
'Clarify how management decisions are made if a serious IT or cyber incident occurs.',
'Escalation description, management note', 
'OPEN',
  NOW(), NOW(), true);

insert into task (organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (1, 'Clarify accountability across management and organisation', 
'Clarify how accountability for IT and cyber risks is distributed across management and organisation.',
'Responsibility overview, organisational note', 
'OPEN',
  NOW(), NOW(), true);

insert into task (organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (1, 'Establish an overview of key IT and cyber risks', 
'Identify and document the most significant IT and cyber risks from a business perspective.',
'Risk overview, high-level risk list', 
'NOT_STARTED',
  NOW(), NOW(), true);

insert into task_profile (task_id, profile_id)
values (1, 1);

insert into task_profile (task_id, profile_id)
values (2, 1);

insert into task_profile (task_id, profile_id)
values (3, 1);

insert into task_profile (task_id, profile_id)
values (4, 1);

insert into task_profile (task_id, profile_id)
values (5, 1);

insert into artifact (organization_id, name, description, type, mime_Type, extension, size, original_name, created_at, updated_at, active)
values (1, 'Document 1', 'Description for Document 1', 'DOCUMENT', 'application/doc', 'doc', '192828', 'hest.doc', 
  NOW(), NOW(), true);

insert into artifact (organization_id, name, description, type, mime_Type, extension, size, original_name, created_at, updated_at, active)
values (1, 'Document 2', 'Description for Document 2', 'EXCEL', 'application/xlt', 'doc', '243241231', 'hest.ods',
  NOW(), NOW(), true);

insert into artifact (organization_id, name, description, type, mime_Type, extension, size, original_name, created_at, updated_at, active)
values (1, 'Document 3', 'Description for Document 3', 'IMAGE', 'application/png', 'png', '19828', 'hest.png',
  NOW(), NOW(), true);

insert into artifact (organization_id, name, description, type, mime_Type, extension, size, original_name, created_at, updated_at, active)
values (1, 'Document 4', 'Description for Document 4', 'DOCUMENT', 'application/odt', 'odt', '12298228', 'hest.odt',
  NOW(), NOW(), true);

insert into task_artifact (task_id, artifact_id)
values (1, 1);

insert into task_artifact (task_id, artifact_id)
values (1, 2);

insert into task_artifact (task_id, artifact_id)
values (1, 3);

insert into task_artifact (task_id, artifact_id)
values (1, 4);

-- login
SELECT setval(
  pg_get_serial_sequence('login', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM login)
);

-- organization
SELECT setval(
  pg_get_serial_sequence('organization', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM organization)
);

-- organization Settings
SELECT setval(
  pg_get_serial_sequence('organization_settings', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM organization)
);

-- profile
SELECT setval(
  pg_get_serial_sequence('profile', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM profile)
);

-- task
SELECT setval(
  pg_get_serial_sequence('task', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM task)
);

-- artifact
SELECT setval(
  pg_get_serial_sequence('artifact', 'id'),
  (SELECT COALESCE(MAX(id), 1) FROM artifact)
);

------------------------------------------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------------------------











truncate login cascade;

insert into login (id, email, role, name, nickname, work_function, password_hash, created_at, updated_at, active)
Values (1, 'rfs@skardhamar.com', 'SUPER_ADMIN', 'Rune Skardhamar', 'Rune', 'DEVELOPER', '$2b$10$ncSCjyAU96eXnVoh0HtPXey6ObQ0G13IXijuqdDs08TVbic.0TJaS', NOW(), NOW(), true);

select * from login;

truncate organization cascade;
insert into organization (id, name, description, created_at, updated_at, active)
values (1, 'Acme Ltd.', '', NOW(), NOW(), true);

insert into organization (id, name, created_at, updated_at, active)
Values (2, 'Vejle Byråd', NOW(), NOW(), true);

insert into organization (id, name, created_at, updated_at, active)
Values (3, 'Corp 1', NOW(), NOW(), true);

insert into organization (id, name, created_at, updated_at, active)
Values (4, 'Corp 2', NOW(), NOW(), true);

insert into organization (id, name, created_at, updated_at, active)
Values (5, 'Corp 3', NOW(), NOW(), true);

insert into organization (id, name, created_at, updated_at, active)
Values (6, 'Corp 4', NOW(), NOW(), true);

insert into organization (id, name, created_at, updated_at, active)
Values (7, 'Corp 5', NOW(), NOW(), true);

insert into organization (id, name, created_at, updated_at, active)
Values (8, 'Corp 6', NOW(), NOW(), true);

select * from organization;

truncate profile;
insert into profile (id, organization_id, name, description, created_at, updated_at, active)
values (1, 1, 'Preben Elkjær', '', NOW(), NOW(), true);

select * from profile;

truncate task;
insert into task (id, organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (1, 1, 'Clarify management ownership for IT and cyber risk', 
'Identify and clarify who at management level has overall ownership of IT and cyber risks.',
'Role description, management note, decision record', 
'OPEN',
  NOW(), NOW(), true);

insert into task (id, organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (2, 1, 'Clarify how management follows up on IT and cyber risks', 
'Clarify how management receives updates and follows up on IT and cyber risks over time.',
'Reporting outline, meeting agenda, follow-up note', 
'OPEN',
  NOW(), NOW(), true);

insert into task (id, organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (3, 1, 'Clarify decision-making in case of serious incidents', 
'Clarify how management decisions are made if a serious IT or cyber incident occurs.',
'Escalation description, management note', 
'OPEN',
  NOW(), NOW(), true);

insert into task (id, organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (4, 1, 'Clarify accountability across management and organisation', 
'Clarify how accountability for IT and cyber risks is distributed across management and organisation.',
'Responsibility overview, organisational note', 
'OPEN',
  NOW(), NOW(), true);

insert into task (id, organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (5, 1, 'Establish an overview of key IT and cyber risks', 
'Identify and document the most significant IT and cyber risks from a business perspective.',
'Risk overview, high-level risk list', 
'NOT_STARTED',
  NOW(), NOW(), true);

insert into task (id, organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (4, '', 
'',
'', 
  NOW(), NOW(), true);

insert into task (id, organization_id, name, description, expected_evidence, status, created_at, updated_at, active)
values (4, '', 
'',
'', 
  NOW(), NOW(), true);


select * from task;

select * from task_profile;
truncate task_profile cascade;
insert into task_profile (task_id, profile_id)
values (1, 1);

insert into task_profile (task_id, profile_id)
values (2, 1);

insert into task_profile (task_id, profile_id)
values (3, 1);

insert into task_profile (task_id, profile_id)
values (4, 1);

insert into task_profile (task_id, profile_id)
values (5, 1);





model Organization {
    id                  Int       @id(map: "organization_pkey") @default(autoincrement())
    name                String
    description         String?
    active              Boolean   @default(true)
    createdAt           DateTime  @default(now()) @db.Timestamptz(3)                      @map("created_at")
    updatedAt           DateTime  @updatedAt      @db.Timestamptz(3)                      @map("updated_at")

    profiles            Profile[]

    @@map("organization")
}





model Organization {
    id                  Int       @id(map: "organization_pkey") @default(autoincrement())
    name                String
    description         String?
    active              Boolean   @default(true)
    createdAt           DateTime  @default(now()) @db.Timestamptz(3)                      @map("created_at")
    updatedAt           DateTime  @updatedAt      @db.Timestamptz(3)                      @map("updated_at")

    profiles            Profile[]

    @@map("organization")
}




await prisma.user.create({
    data: {
        email: 'rfs@skardhamar.com',
        role: 'SUPER_ADMIN',          // TypeScript will autocomplete these
        name: 'Rune Skardhamar',
        nickname: 'Rune',
        workFunction: 'DEVELOPER',    // TypeScript will autocomplete
        passwordHash: '$2b$10$ncSCjyAU96eXnVoh0HtPXey6ObQ0G13IXijuqdDs08TVbic.0TJaS'
    }
});










CREATE TABLE compliance.user (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"(lower(email));


INSERT INTO "user" (email, password, name)
VALUES (
  'slam@slam.dk',
  '$2b$10$dzbwXvTR2tl7a52uGiCG2.M.Ht.IbIp7rb6czvJgKtkY/9fp2cD/a',
  'Test User'
);



drop database compliance;
create database compliance
    character set utf8
    default character set utf8
    collate utf8_general_ci
    default collate utf8_general_ci;

CREATE USER 'compliance'@'localhost' IDENTIFIED BY 'hesteogGrise246!';
GRANT ALL PRIVILEGES ON compliance.* TO 'compliance'@'localhost' WITH GRANT OPTION;

ALTER USER 'compliance'@'localhost' IDENTIFIED BY 'sdfkjjk23432SASSXCa#';

/* ----------------------------------------------------------------------
** COOKIE
   ---------------------------------------------------------------------- */
drop table if exists compliance.cookie;
create table compliance.cookie
(
    cookie_id             int           unsigned  not null auto_increment primary key,

    cookie                int           unsigned  not null,
    profile_id            int           unsigned  not null,

    active                      bool                  not null default true,
    date_upd                    timestamp             not null default now() on update now(),
    date_created                timestamp             not null default CURRENT_TIMESTAMP,

    index (cookie),
    index (profile_id)
) engine=InnoDB default character set=utf8mb4;


/* ----------------------------------------------------------------------
** ORGANISATION
   ---------------------------------------------------------------------- */
drop table if exists compliance.organisation;
create table compliance.organisation
(
    organisation_id             int           unsigned not null auto_increment primary key,

    name                        varchar(255)           not null default '',
    short_description           varchar(255)           not null default '',
    description                 text                   not null,

    ig                          tinyint                not null default 1,

    active                      bool                   not null default true,
    date_upd                    timestamp              not null default now() on update now(),
    date_created                timestamp              not null default CURRENT_TIMESTAMP
) engine=InnoDB default character set=utf8mb4;

/* ----------------------------------------------------------------------
** PROFILE
   ---------------------------------------------------------------------- */
drop table if exists compliance.profile;
create table compliance.profile
(
    profile_id                  int           unsigned not null auto_increment primary key,
    organisation_id             int           unsigned not null,

    login                       varchar(32)            not null default '',
    password                    varchar(256)           not null default '',

    name                        varchar(255)           not null default '',
    short_description           varchar(255)           not null default '',
    description                 text                   not null,

    role                        tinyint       unsigned not null,

    email                       varchar(255)           not null default '',

    logout_timer                mediumint     unsigned not null default 525600,
    last_login                  timestamp              not null default CURRENT_TIMESTAMP,
    last_activity               timestamp              not null default CURRENT_TIMESTAMP,
    language_id                 tinyint       unsigned not null default 0,                       /* Default English. */


    active                      bool                   not null default true,
    date_upd                    timestamp              not null default now() on update now(),
    date_created                timestamp              not null default CURRENT_TIMESTAMP
) engine=InnoDB default character set=utf8mb4;

/* ----------------------------------------------------------------------
** SAFEGUARD
                safeguard_data_id : 1,
                safeguard_id      : 1,
                status            : 1,
                priority          : 1,
                likelyhood        : 1,
                impact            : 1,
                owner             : 1

   ---------------------------------------------------------------------- */
drop table if exists compliance.safeguard;
create table compliance.safeguard
(
    safeguard_id                int           unsigned not null auto_increment primary key,
    organisation_id             int           unsigned not null,

    control_index               tinyint       unsigned not null default 0,
    safeguard_index             tinyint       unsigned not null default 0,

    status                      tinyint       unsigned not null default 0,
    priority                    tinyint       unsigned not null default 0,
    likelyhood                  tinyint       unsigned not null default 0,
    impact                      tinyint       unsigned not null default 0,
    owner_id                    int           unsigned not null,                                    /* Profile ID */

    active                      bool                   not null default true,
    date_upd                    timestamp              not null default now() on update now(),
    date_created                timestamp              not null default CURRENT_TIMESTAMP
) engine=InnoDB default character set=utf8mb4;

/* ----------------------------------------------------------------------
** NOTES
   ---------------------------------------------------------------------- */
drop table if exists compliance.notes;
create table compliance.notes
(
    notes_id                    int           unsigned not null auto_increment primary key,
    organisation_id             int           unsigned not null,

    task_id                     int           unsigned not null,
    control_id                  int           unsigned not null,
    safeguard_id                int           unsigned not null,

    notes                       JSON                   not null,

    active                      bool                   not null default true,
    date_upd                    timestamp              not null default now() on update now(),
    date_created                timestamp              not null default CURRENT_TIMESTAMP
) engine=InnoDB default character set=utf8mb4;

/* ----------------------------------------------------------------------
** LOG
   ---------------------------------------------------------------------- */
drop table if exists compliance.log;
create table compliance.log
(
    log_id                      int           unsigned not null auto_increment primary key,
    organisation_id             int           unsigned not null,

    task_id                     int           unsigned not null,
    control_id                  int           unsigned not null,
    safeguard_id                int           unsigned not null,

    message                     text                   not null,

    active                      bool                   not null default true,
    date_upd                    timestamp              not null default now() on update now(),
    date_created                timestamp              not null default CURRENT_TIMESTAMP
) engine=InnoDB default character set=utf8mb4;
