// ── CIS Controls v8 — Data ──────────────────────────────────────────────────

export type Safeguard = {
  id        : string;   // e.g. "1.1"
  title     : string;
  definition: string;
  purpose   : string;
  why       : string;
  ig1: { scope: string; approach: string; example: string; resources: string };
  ig2: { scope: string; approach: string; example: string; resources: string };
  ig3: { scope: string; approach: string; example: string; resources: string };
};

export type CISControl = {
  id        : number;
  title     : string;
  definition: string;
  purpose   : string;
  safeguards: Safeguard[];
};

const NA_IG    = { scope: 'N/A', approach: '', example: '', resources: '' };

// Helper: build IG tiers from a base description
function ig(i1: typeof NA_IG | null, i2: typeof NA_IG | null, i3: typeof NA_IG | null) {
  return { ig1: i1 ?? NA_IG, ig2: i2 ?? NA_IG, ig3: i3 ?? NA_IG };
}

export const CIS_CONTROLS: CISControl[] = 
[
    // ════════════════════════════════════════════════════════════════════════════
    // Control 1 — Inventory and Control of Enterprise Assets
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 1,
      title: 'Inventory and Control of Enterprise Assets',
      definition: 'Actively manage (inventory, track, and correct) all enterprise assets connected to the infrastructure, including end-user devices, network devices, non-computing/IoT devices, and servers, to accurately know the totality of assets that need to be monitored and protected.',
      purpose: 'Ensure the organization has visibility into all devices on its network to prevent unauthorized access, reduce attack surfaces, and enable other security controls. You cannot protect what you do not know exists.',
      safeguards: [
        {
          id: '1.1', title: 'Establish and Maintain Detailed Enterprise Asset Inventory',
          definition: 'Establish and maintain an accurate, detailed, and up-to-date inventory of all enterprise assets with the potential to store or process data, to include end-user devices, network devices, non-computing/IoT devices, and servers.',
          purpose: 'Provide visibility into all assets to prevent unauthorized access and enable other security controls such as vulnerability management and access control.',
          why: 'A complete asset inventory is the cornerstone of cybersecurity — without it, unknown devices can be exploited and other controls are ineffective.',
          ig1: { scope: 'Create a basic inventory of all assets.', approach: 'Use manual or semi-automated methods (e.g., spreadsheets, Nmap scans) to list assets with minimal details like asset type, IP address, and location.', example: 'A small business uses an Excel spreadsheet to list office computers, routers, and printers, reviewed yearly.', resources: 'Minimal — suitable for organizations with no dedicated IT staff.' },
          ig2: { scope: 'Develop a detailed, automated inventory for dynamic networks.', approach: 'Deploy automated tools (e.g., Lansweeper, ServiceNow) to track assets with attributes like IP/MAC address, OS version, owner, and location. Update monthly.', example: 'A mid-sized company uses Lansweeper to automatically track servers and laptops, updating the inventory monthly.', resources: 'Moderate — requires automated tools and basic IT expertise.' },
          ig3: { scope: 'Maintain a real-time, comprehensive inventory for complex environments.', approach: 'Use enterprise-grade tools (e.g., ServiceNow ITAM, Tenable.io) integrated with CMDBs and security platforms to track assets in real-time, including transient cloud instances and IoT.', example: 'An enterprise uses ServiceNow with AWS Config to track cloud VMs and IoT devices, feeding data to Splunk for real-time monitoring.', resources: 'Significant — requires dedicated security teams and enterprise tools.' },
        },
        {
          id: '1.2', title: 'Address Unauthorized Assets',
          definition: 'Ensure that a process exists to address unauthorized assets on a weekly basis. The enterprise may choose to remove the asset from the network, deny the asset from connecting remotely, or quarantine the asset.',
          purpose: 'Prevent rogue or unmanaged devices from introducing security risks by detecting and resolving them promptly.',
          why: 'Unauthorized assets are common entry points for attackers. This safeguard ensures only approved devices operate on the network.',
          ig1: { scope: 'Basic process to identify and remove unauthorized assets.', approach: 'Manually compare network scans against the asset inventory to detect rogue devices. Remove them or document exceptions.', example: 'A small business runs quarterly Nmap scans, identifies an unauthorized Wi-Fi router, and disconnects it.', resources: 'Minimal — using free tools like Nmap.' },
          ig2: { scope: 'Automated detection and response to unauthorized assets.', approach: 'Use network access control (NAC) tools or endpoint management to detect and quarantine unauthorized devices. Document exceptions with approval processes.', example: 'A mid-sized company uses NAC to block unrecognized devices and logs exceptions in a CMDB.', resources: 'Moderate — requires automated tools and IT expertise.' },
          ig3: { scope: 'Continuous, real-time detection and automated remediation.', approach: 'Integrate NAC with SIEM for real-time alerts on unauthorized assets. Automate quarantine or removal and maintain detailed audit trails.', example: 'An enterprise uses Forescout to instantly quarantine rogue IoT devices and logs actions in ServiceNow.', resources: 'Significant — requires enterprise-grade tools and security teams.' },
        },
        {
          id: '1.3', title: 'Utilize an Active Discovery Tool',
          definition: 'Utilize an active discovery tool to identify assets connected to the enterprise\'s network. Configure the active discovery tool to execute daily, or more frequently.',
          purpose: 'Automate the discovery of assets to ensure the inventory remains accurate, especially for dynamic environments with new or transient devices.',
          why: 'Active discovery ensures the inventory stays current, critical for dynamic networks.',
          ...ig(null,
            { scope: 'Introduce active discovery to automate asset identification.', approach: 'Deploy tools like Nmap, Open-AudIT, or Lansweeper to periodically scan the network and update the inventory.', example: 'A mid-sized organization schedules daily Lansweeper scans to detect new laptops or servers.', resources: 'Moderate — requires automated scanning tools.' },
            { scope: 'Continuous active discovery for real-time updates.', approach: 'Use advanced tools (e.g., Tenable.io, Qualys) integrated with CMDBs to scan networks continuously, capturing transient assets like cloud instances.', example: 'An enterprise uses Tenable.io to detect new cloud VMs in AWS and updates ServiceNow in real-time.', resources: 'Significant — requires enterprise tools and integration.' }),
        },
        {
          id: '1.4', title: 'Use Dynamic Host Configuration Protocol (DHCP) Logging to Update Enterprise Asset Inventory',
          definition: 'Use DHCP logging on all DHCP servers or IP address management tools to update the enterprise\'s asset inventory. Review and use logs to update the asset inventory weekly, or more frequently.',
          purpose: 'Leverage DHCP server logs to track devices dynamically assigned IP addresses, ensuring the inventory captures transient or mobile devices.',
          why: 'DHCP logging ensures dynamic devices (e.g., laptops, BYOD) are tracked, critical for larger networks.',
          ...ig(null,
            { scope: 'Basic DHCP logging to track dynamic IPs.', approach: 'Enable logging on DHCP servers to capture IP assignments and update the inventory manually or via scripts.', example: 'A mid-sized company logs DHCP leases and updates its Lansweeper inventory monthly.', resources: 'Moderate — requires DHCP server access.' },
            { scope: 'Automated, real-time DHCP integration.', approach: 'Integrate DHCP logs with CMDB or SIEM to automatically update the inventory when devices join the network.', example: 'An enterprise uses Splunk to parse DHCP logs and updates ServiceNow in real-time.', resources: 'Significant — requires integration and automation.' }),
        },
        {
          id: '1.5', title: 'Use a Passive Asset Discovery Tool',
          definition: 'Use a passive discovery tool to identify assets connected to the enterprise\'s network. Review and use scans to update the enterprise\'s asset inventory at least weekly, or more frequently.',
          purpose: 'Complement active discovery by monitoring network traffic to identify assets without actively probing, reducing network impact.',
          why: 'Passive discovery catches devices missed by active scans, enhancing visibility for high-security environments.',
          ...ig(null, null,
            { scope: 'Advanced passive discovery integrated with security systems.', approach: 'Deploy enterprise-grade tools (e.g., Darktrace, Cisco Stealthwatch) to continuously monitor traffic, detect transient devices, and feed data to SIEM or CMDB.', example: 'An enterprise uses Darktrace to identify rogue devices via traffic anomalies and updates ServiceNow automatically.', resources: 'Significant — requires advanced monitoring and integration.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 2 — Inventory and Control of Software Assets
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 2,
      title: 'Inventory and Control of Software Assets',
      definition: 'Actively manage (inventory, track, and correct) all software on the network so that only authorized software is installed and can execute, and that unauthorized and unmanaged software is found and prevented from installation or execution.',
      purpose: 'Ensure only authorized, supported software runs on enterprise assets to reduce the attack surface from vulnerable, unauthorized, or unmanaged applications.',
      safeguards: [
        {
          id: '2.1', title: 'Establish and Maintain a Software Inventory',
          definition: 'Establish and maintain a detailed inventory of all licensed software installed on enterprise assets. The inventory must document the title, publisher, initial install/use date, and business purpose for each entry.',
          purpose: 'Provide a comprehensive view of what software is deployed to enable vulnerability management and license compliance.',
          why: 'Without a software inventory, organizations cannot identify unauthorized or vulnerable applications that increase risk.',
          ig1: { scope: 'Create a basic software inventory.', approach: 'Manually document installed software using spreadsheets or built-in OS tools (e.g., Windows Programs and Features).', example: 'A small business maintains a spreadsheet listing all installed applications and their versions.', resources: 'Minimal — manual effort only.' },
          ig2: { scope: 'Automated software inventory across the enterprise.', approach: 'Deploy software inventory tools (e.g., SCCM, Lansweeper, PDQ Inventory) to automatically scan and catalog installed software.', example: 'A mid-sized company uses SCCM to automatically discover and inventory all installed software across endpoints.', resources: 'Moderate — requires deployment of inventory tools.' },
          ig3: { scope: 'Real-time, comprehensive software inventory.', approach: 'Use enterprise asset management platforms integrated with CMDB for real-time software tracking including cloud/SaaS applications.', example: 'An enterprise uses ServiceNow SAM to track all software including SaaS subscriptions and shadow IT.', resources: 'Significant — requires enterprise tools and continuous monitoring.' },
        },
        {
          id: '2.2', title: 'Ensure Authorized Software is Currently Supported',
          definition: 'Ensure that only currently supported software is designated as authorized in the software inventory. If software is unsupported yet necessary, document an exception. Review monthly, or more frequently.',
          purpose: 'Prevent use of end-of-life software that no longer receives security patches, reducing exposure to known vulnerabilities.',
          why: 'Unsupported software cannot be patched and is a prime target for attackers exploiting known vulnerabilities.',
          ig1: { scope: 'Identify and track unsupported software.', approach: 'Manually check vendor support status for key applications. Document any exceptions for necessary unsupported software.', example: 'A small business checks annually whether its OS and key applications are still supported.', resources: 'Minimal — periodic manual checks.' },
          ig2: { scope: 'Automated tracking of software support status.', approach: 'Use vulnerability scanners or software inventory tools that flag end-of-life software. Review and remediate monthly.', example: 'A mid-sized company uses Qualys to flag unsupported OS versions and tracks remediation in Jira.', resources: 'Moderate — requires vulnerability scanning tools.' },
          ig3: { scope: 'Continuous monitoring with automated enforcement.', approach: 'Integrate software lifecycle tracking with CMDB and automate alerts or blocks when software reaches end-of-life status.', example: 'An enterprise uses ServiceNow to automatically notify asset owners 90 days before software end-of-life.', resources: 'Significant — requires integrated lifecycle management.' },
        },
        {
          id: '2.3', title: 'Address Unauthorized Software',
          definition: 'Ensure that unauthorized software is either removed from enterprise assets or receives a documented exception. Review monthly, or more frequently.',
          purpose: 'Reduce the attack surface by ensuring only approved software runs on enterprise assets.',
          why: 'Unauthorized software may contain vulnerabilities, malware, or violate licensing, all of which increase organizational risk.',
          ig1: { scope: 'Basic process to identify and remove unauthorized software.', approach: 'Compare installed software against the authorized inventory and remove unapproved applications manually.', example: 'A small business quarterly reviews installed programs and removes unauthorized tools.', resources: 'Minimal — manual review process.' },
          ig2: { scope: 'Automated detection of unauthorized software.', approach: 'Use endpoint management tools to detect software not on the approved list and generate alerts for remediation.', example: 'A mid-sized company uses SCCM to detect and flag unauthorized software installations.', resources: 'Moderate — requires endpoint management tools.' },
          ig3: { scope: 'Automated prevention and removal of unauthorized software.', approach: 'Use application control policies to automatically block unauthorized software and generate audit logs.', example: 'An enterprise uses Microsoft AppLocker integrated with SIEM to block and alert on unauthorized installs.', resources: 'Significant — requires application control infrastructure.' },
        },
        {
          id: '2.4', title: 'Utilize Automated Software Inventory Tools',
          definition: 'Utilize software inventory tools, when possible, throughout the enterprise to automate the discovery and documentation of installed software.',
          purpose: 'Improve accuracy and timeliness of the software inventory by automating discovery instead of relying on manual processes.',
          why: 'Manual software inventories are error-prone and quickly become outdated in dynamic environments.',
          ...ig(null,
            { scope: 'Deploy automated software inventory tools.', approach: 'Use tools like SCCM, PDQ Inventory, or Lansweeper to automatically discover installed software across the enterprise.', example: 'A mid-sized company deploys PDQ Inventory to scan all endpoints weekly for installed software.', resources: 'Moderate — requires licensing and deploying inventory tools.' },
            { scope: 'Enterprise-wide real-time software discovery.', approach: 'Deploy comprehensive tools integrated with CMDB and security platforms for continuous software discovery including cloud workloads.', example: 'An enterprise uses Tanium for real-time software inventory across all endpoints, servers, and cloud instances.', resources: 'Significant — requires enterprise-grade tools.' }),
        },
        {
          id: '2.5', title: 'Allowlist Authorized Software',
          definition: 'Use technical controls, such as application allowlisting, to ensure that only authorized software can execute or be accessed. Reassess bi-annually, or more frequently.',
          purpose: 'Proactively prevent unauthorized or malicious software from executing on enterprise assets.',
          why: 'Allowlisting is one of the most effective controls against malware and unauthorized applications.',
          ...ig(null,
            { scope: 'Implement application allowlisting on critical assets.', approach: 'Deploy application allowlisting solutions (e.g., Windows AppLocker, Carbon Black) on servers and high-risk endpoints.', example: 'A mid-sized company uses AppLocker to restrict executable software on servers to an approved list.', resources: 'Moderate — requires policy design and allowlist management.' },
            { scope: 'Enterprise-wide application allowlisting.', approach: 'Deploy application allowlisting across all endpoints and servers with centralized management and regular policy reviews.', example: 'An enterprise uses CrowdStrike to enforce application allowlists across all endpoints with weekly policy reviews.', resources: 'Significant — requires dedicated management and enterprise tools.' }),
        },
        {
          id: '2.6', title: 'Allowlist Authorized Libraries',
          definition: 'Use technical controls to ensure that only authorized software libraries (such as .dll, .ocx, .so files) are allowed to load into a system process. Block unauthorized libraries from loading.',
          purpose: 'Prevent malicious or vulnerable libraries from being loaded by applications, a common technique used in DLL hijacking attacks.',
          why: 'Library-level controls prevent sophisticated attacks like DLL injection and supply chain compromises.',
          ...ig(null, null,
            { scope: 'Advanced library-level allowlisting.', approach: 'Implement library allowlisting using advanced endpoint protection tools, code signing enforcement, and integrity monitoring.', example: 'An enterprise enforces code-signed DLLs on critical servers using Windows Defender Application Control (WDAC).', resources: 'Significant — requires advanced endpoint security and code signing infrastructure.' }),
        },
        {
          id: '2.7', title: 'Allowlist Authorized Scripts',
          definition: 'Use technical controls, such as digital signatures and version control, to ensure that only authorized scripts (e.g., .ps1, .py files) are allowed to execute. Block unauthorized scripts.',
          purpose: 'Prevent malicious scripts from executing, which is a common attack vector for fileless malware and living-off-the-land attacks.',
          why: 'Scripts are frequently used by attackers because they are lightweight, flexible, and can evade traditional antimalware.',
          ...ig(null, null,
            { scope: 'Enterprise-wide script execution control.', approach: 'Enforce script signing policies, constrained language modes (e.g., PowerShell Constrained Language Mode), and script block logging.', example: 'An enterprise requires all PowerShell scripts to be digitally signed and logs all script execution via SIEM.', resources: 'Significant — requires code signing infrastructure and script policy management.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 3 — Data Protection
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 3,
      title: 'Data Protection',
      definition: 'Develop processes and technical controls to identify, classify, securely handle, retain, and dispose of data. This includes data at rest, in transit, and in use across the enterprise.',
      purpose: 'Protect organizational data from unauthorized access, exfiltration, and loss by establishing data governance practices aligned with regulatory requirements and business needs.',
      safeguards: [
        {
          id: '3.1', title: 'Establish and Maintain a Data Management Process',
          definition: 'Establish and maintain a data management process addressing data sensitivity, data owner, handling of data, data retention limits, and disposal requirements. Review and update annually.',
          purpose: 'Provide a structured framework for how data is classified, handled, and disposed of throughout its lifecycle.',
          why: 'Without a data management process, sensitive data may be mishandled, over-retained, or improperly disposed of, leading to breaches or compliance violations.',
          ig1: { scope: 'Create a basic data management process.', approach: 'Document a simple data handling policy covering types of data, who owns it, and basic retention/disposal guidelines.', example: 'A small business documents that customer PII is retained for 3 years and then securely deleted.', resources: 'Minimal — policy documentation only.' },
          ig2: { scope: 'Formalized data management with classification.', approach: 'Develop a comprehensive data management policy with classification levels, handling procedures, retention schedules, and disposal methods.', example: 'A mid-sized company creates a data governance policy with "Public," "Internal," and "Confidential" classification levels.', resources: 'Moderate — requires policy development and staff training.' },
          ig3: { scope: 'Enterprise-wide data governance program.', approach: 'Implement a full data governance framework with automated classification, data lineage tracking, and integration with DLP and compliance tools.', example: 'An enterprise uses Microsoft Purview for automated data classification and lifecycle management across all repositories.', resources: 'Significant — requires data governance tools and dedicated staff.' },
        },
        {
          id: '3.2', title: 'Establish and Maintain a Data Inventory',
          definition: 'Establish and maintain a data inventory based on the enterprise\'s data management process. Inventory sensitive data at a minimum. Review and update annually.',
          purpose: 'Ensure the organization knows where its sensitive data resides so it can be properly protected and monitored.',
          why: 'You cannot protect data you do not know exists. A data inventory enables targeted security controls and compliance.',
          ig1: { scope: 'Basic inventory of sensitive data.', approach: 'Manually identify and document where sensitive data (e.g., PII, financial) is stored across key systems.', example: 'A small business lists that customer data is in its CRM, accounting system, and email.', resources: 'Minimal — manual documentation.' },
          ig2: { scope: 'Comprehensive data inventory with automated discovery.', approach: 'Use data discovery tools to scan repositories, databases, and file shares to identify and classify sensitive data.', example: 'A mid-sized company uses Varonis to scan file shares and identify files containing PII or financial data.', resources: 'Moderate — requires data discovery tools.' },
          ig3: { scope: 'Real-time data inventory across all environments.', approach: 'Deploy enterprise data cataloging tools integrated with cloud platforms for continuous discovery and classification of sensitive data.', example: 'An enterprise uses Collibra with cloud connectors to maintain a real-time catalog of all sensitive data across on-prem and cloud.', resources: 'Significant — requires enterprise data cataloging and integration.' },
        },
        {
          id: '3.3', title: 'Configure Data Access Control Lists',
          definition: 'Configure data access control lists based on a user\'s need to know. Apply access control lists to local and remote file systems, databases, and applications.',
          purpose: 'Ensure users can only access data necessary for their role, implementing the principle of least privilege for data access.',
          why: 'Overly permissive data access is a leading cause of data breaches and insider threats.',
          ig1: { scope: 'Basic data access controls.', approach: 'Set file and folder permissions to restrict access to sensitive data to authorized users only.', example: 'A small business configures shared folder permissions so only HR can access employee records.', resources: 'Minimal — uses built-in OS permissions.' },
          ig2: { scope: 'Role-based data access controls.', approach: 'Implement role-based access control (RBAC) across file systems, databases, and applications with regular access reviews.', example: 'A mid-sized company implements AD groups mapped to data access levels and reviews permissions quarterly.', resources: 'Moderate — requires directory services and access review processes.' },
          ig3: { scope: 'Fine-grained, attribute-based access controls.', approach: 'Implement attribute-based access control (ABAC) with dynamic policies based on user context, data classification, and risk level.', example: 'An enterprise uses Azure AD Conditional Access with data classification labels to dynamically control access based on user, device, and location.', resources: 'Significant — requires identity governance and advanced access management.' },
        },
        {
          id: '3.4', title: 'Enforce Data Retention',
          definition: 'Retain data according to the enterprise\'s data management process. Data retention must include both minimum and maximum timelines.',
          purpose: 'Ensure data is kept as long as needed for business and compliance purposes but not longer, reducing risk from over-retention.',
          why: 'Over-retaining data increases breach impact and storage costs; under-retaining data may violate regulatory requirements.',
          ig1: { scope: 'Basic data retention guidelines.', approach: 'Define and follow simple retention periods for key data types. Delete data that exceeds retention periods.', example: 'A small business deletes old client records after the 5-year retention period expires.', resources: 'Minimal — manual process.' },
          ig2: { scope: 'Automated data retention enforcement.', approach: 'Implement retention policies in email, file storage, and backup systems. Use automated tools to flag or delete expired data.', example: 'A mid-sized company configures Exchange retention policies and uses SharePoint content lifecycle policies.', resources: 'Moderate — requires configuration of platform retention features.' },
          ig3: { scope: 'Enterprise-wide automated retention management.', approach: 'Deploy records management systems with automated retention and legal hold capabilities across all data repositories.', example: 'An enterprise uses Microsoft Purview with automated retention labels and legal hold integration for compliance.', resources: 'Significant — requires records management platform and governance.' },
        },
        {
          id: '3.5', title: 'Securely Dispose of Data',
          definition: 'Securely dispose of data as outlined in the enterprise\'s data management process. Ensure the disposal process and method are commensurate with the data sensitivity.',
          purpose: 'Prevent sensitive data from being recovered after disposal, whether from decommissioned hardware, deleted files, or retired cloud services.',
          why: 'Improperly disposed data can be recovered by attackers from discarded drives, recycled equipment, or deleted cloud storage.',
          ig1: { scope: 'Basic secure data disposal.', approach: 'Use built-in OS secure delete or factory reset for retired devices. Physically destroy storage media for highly sensitive data.', example: 'A small business factory-resets old laptops and shreds paper records before disposal.', resources: 'Minimal — basic procedures.' },
          ig2: { scope: 'Formalized data disposal procedures.', approach: 'Implement documented disposal procedures using certified data wiping tools and maintain disposal records.', example: 'A mid-sized company uses DBAN for secure disk wiping and logs all asset disposal in a tracking system.', resources: 'Moderate — requires wiping tools and documentation.' },
          ig3: { scope: 'Verified, auditable data disposal.', approach: 'Use certified destruction services with chain-of-custody documentation. Verify disposal through audits and integrate with asset management.', example: 'An enterprise uses certified e-waste vendors with certificates of destruction fed into ServiceNow asset lifecycle records.', resources: 'Significant — requires certified services and audit processes.' },
        },
        {
          id: '3.6', title: 'Encrypt Data on End-User Devices',
          definition: 'Encrypt data on end-user devices containing sensitive data. Example implementations include Windows BitLocker, Apple FileVault, Linux dm-crypt.',
          purpose: 'Protect sensitive data from unauthorized access if devices are lost, stolen, or improperly decommissioned.',
          why: 'Lost or stolen laptops and mobile devices are a leading cause of data breaches. Encryption renders data unreadable without proper authentication.',
          ig1: { scope: 'Enable full-disk encryption on all end-user devices.', approach: 'Enable built-in encryption tools (BitLocker, FileVault) on all laptops and desktops.', example: 'A small business enables BitLocker on all Windows laptops using a simple recovery key policy.', resources: 'Minimal — uses built-in OS features.' },
          ig2: { scope: 'Managed, policy-enforced device encryption.', approach: 'Enforce encryption via endpoint management (e.g., Intune, JAMF) with centralized key management and compliance reporting.', example: 'A mid-sized company uses Intune to enforce BitLocker and reports compliance status in a dashboard.', resources: 'Moderate — requires endpoint management platform.' },
          ig3: { scope: 'Enterprise encryption with advanced key management.', approach: 'Implement enterprise key management with hardware security modules (HSMs), automated compliance monitoring, and recovery procedures.', example: 'An enterprise uses centralized key management with HSM-backed recovery keys and automated compliance alerts.', resources: 'Significant — requires key management infrastructure.' },
        },
        {
          id: '3.7', title: 'Establish and Maintain a Data Classification Scheme',
          definition: 'Establish and maintain an overall data classification scheme for the enterprise. Enterprises may use labels such as "Sensitive," "Confidential," and "Public." Review and update annually.',
          purpose: 'Enable consistent handling of data based on its sensitivity level, guiding protection measures, access controls, and disposal procedures.',
          why: 'Without data classification, all data is treated the same, leading to either over-protection of public data or under-protection of sensitive data.',
          ...ig(null,
            { scope: 'Define and implement a data classification scheme.', approach: 'Establish classification labels (e.g., Public, Internal, Confidential, Restricted) with handling guidelines for each level.', example: 'A mid-sized company defines four classification levels and trains staff to label documents accordingly.', resources: 'Moderate — requires policy development and training.' },
            { scope: 'Automated data classification enforcement.', approach: 'Deploy automated classification tools that apply labels based on content inspection and enforce handling rules through DLP policies.', example: 'An enterprise uses Microsoft Purview sensitivity labels with auto-classification rules for documents containing PII.', resources: 'Significant — requires automated classification and DLP tools.' }),
        },
        {
          id: '3.8', title: 'Document Data Flows',
          definition: 'Document data flows. Data flow documentation includes service provider data flows and should be based on the enterprise\'s data management process. Review and update annually.',
          purpose: 'Understand how data moves through and outside the organization to identify security gaps and compliance risks.',
          why: 'Undocumented data flows may expose sensitive data to unauthorized parties or violate data sovereignty requirements.',
          ...ig(null,
            { scope: 'Document key data flows.', approach: 'Create data flow diagrams showing how sensitive data moves between internal systems, cloud services, and third parties.', example: 'A mid-sized company maps how customer data flows from web forms to CRM to payment processor.', resources: 'Moderate — requires diagramming and stakeholder interviews.' },
            { scope: 'Comprehensive, monitored data flow documentation.', approach: 'Maintain detailed data flow maps integrated with network monitoring tools to validate actual data movements match documented flows.', example: 'An enterprise uses data flow mapping tools integrated with network monitoring to continuously validate data movements.', resources: 'Significant — requires data flow tools and monitoring integration.' }),
        },
        {
          id: '3.9', title: 'Encrypt Data on Removable Media',
          definition: 'Encrypt data on removable media.',
          purpose: 'Protect sensitive data stored on USB drives, external hard drives, and other removable media from unauthorized access if lost or stolen.',
          why: 'Removable media is easily lost or stolen and can bypass network security controls.',
          ...ig(null,
            { scope: 'Encrypt data on removable media.', approach: 'Use encrypted USB drives or software-based encryption for data transferred to removable media. Enforce via endpoint policies.', example: 'A mid-sized company issues only hardware-encrypted USB drives and blocks unencrypted removable storage.', resources: 'Moderate — requires encrypted devices or endpoint policies.' },
            { scope: 'Policy-enforced removable media encryption.', approach: 'Implement DLP policies that automatically encrypt data written to removable media or block unauthorized transfers.', example: 'An enterprise uses DLP to auto-encrypt files copied to USB drives and blocks transfers of classified data.', resources: 'Significant — requires DLP infrastructure.' }),
        },
        {
          id: '3.10', title: 'Encrypt Sensitive Data in Transit',
          definition: 'Encrypt sensitive data in transit. Example implementations include TLS and OpenSSH.',
          purpose: 'Prevent interception of sensitive data as it moves across networks, including internal networks and the internet.',
          why: 'Unencrypted data in transit can be intercepted through man-in-the-middle attacks, network sniffing, or compromised infrastructure.',
          ...ig(null,
            { scope: 'Enforce encryption for data in transit.', approach: 'Require TLS/HTTPS for all web traffic, SSH for remote access, and encrypted protocols for email and file transfers.', example: 'A mid-sized company enforces HTTPS on all web applications and uses TLS for email relay.', resources: 'Moderate — requires certificate management and protocol configuration.' },
            { scope: 'Comprehensive transit encryption with monitoring.', approach: 'Enforce TLS 1.2+ across all communications, deploy certificate management automation, and monitor for unencrypted traffic.', example: 'An enterprise uses automated certificate management and network monitoring to detect and alert on unencrypted sensitive data flows.', resources: 'Significant — requires PKI infrastructure and network monitoring.' }),
        },
        {
          id: '3.11', title: 'Encrypt Sensitive Data at Rest',
          definition: 'Encrypt sensitive data at rest on servers, applications, and databases containing sensitive data. Storage-layer encryption meets the minimum requirement.',
          purpose: 'Protect stored sensitive data from unauthorized access, especially in case of unauthorized physical access or storage media theft.',
          why: 'Data at rest is vulnerable to theft through physical access, backup theft, or unauthorized administrative access.',
          ...ig(null,
            { scope: 'Encrypt sensitive data on servers and databases.', approach: 'Enable storage-layer encryption (e.g., TDE for databases, EBS encryption for cloud) for systems storing sensitive data.', example: 'A mid-sized company enables TDE on its SQL Server databases and EBS encryption on AWS instances.', resources: 'Moderate — requires database and storage encryption configuration.' },
            { scope: 'Application-layer encryption with key management.', approach: 'Implement application-layer encryption for highly sensitive data with enterprise key management and HSM backing.', example: 'An enterprise uses application-level field encryption for PII with keys managed in AWS KMS backed by CloudHSM.', resources: 'Significant — requires application changes and key management infrastructure.' }),
        },
        {
          id: '3.12', title: 'Segment Data Processing and Storage Based on Sensitivity',
          definition: 'Segment data processing and storage based on the sensitivity of the data. Do not process sensitive data on enterprise assets intended for lower sensitivity data.',
          purpose: 'Limit the blast radius of a breach by isolating sensitive data from less sensitive environments.',
          why: 'Co-mingling data of different sensitivity levels means a breach of a low-value system could expose high-value data.',
          ...ig(null,
            { scope: 'Segment sensitive data storage and processing.', approach: 'Use network segmentation and separate systems or databases for sensitive vs. non-sensitive data processing.', example: 'A mid-sized company places PCI cardholder data in a separate VLAN with restricted access.', resources: 'Moderate — requires network segmentation and system architecture changes.' },
            { scope: 'Advanced data segmentation with continuous monitoring.', approach: 'Implement micro-segmentation, zero-trust network access, and continuous monitoring to enforce data sensitivity boundaries.', example: 'An enterprise uses micro-segmentation to isolate regulated data environments and monitors cross-boundary traffic.', resources: 'Significant — requires micro-segmentation and zero-trust architecture.' }),
        },
        {
          id: '3.13', title: 'Deploy a Data Loss Prevention Solution',
          definition: 'Implement an automated tool, such as a host-based Data Loss Prevention (DLP) tool, to identify all sensitive data stored, processed, or transmitted through enterprise assets.',
          purpose: 'Automatically detect and prevent unauthorized transfer or exposure of sensitive data.',
          why: 'DLP solutions provide automated protection against both accidental and intentional data leaks that manual controls cannot catch.',
          ...ig(null, null,
            { scope: 'Enterprise DLP deployment.', approach: 'Deploy DLP solutions across endpoints, network, email, and cloud services with policies aligned to data classification.', example: 'An enterprise deploys Symantec DLP across endpoints, email, and cloud apps to detect and block unauthorized sensitive data transfers.', resources: 'Significant — requires DLP platform and policy management.' }),
        },
        {
          id: '3.14', title: 'Log Sensitive Data Access',
          definition: 'Log sensitive data access, including modification and disposal.',
          purpose: 'Maintain an audit trail of who accesses, modifies, or deletes sensitive data for forensics, compliance, and threat detection.',
          why: 'Access logging enables detection of unauthorized data access, supports incident investigation, and satisfies regulatory audit requirements.',
          ...ig(null, null,
            { scope: 'Comprehensive sensitive data access logging.', approach: 'Enable detailed audit logging on all systems containing sensitive data, centralize logs in SIEM, and configure alerts for anomalous access.', example: 'An enterprise logs all database queries against PII tables and feeds logs to Splunk with alerts for bulk data access.', resources: 'Significant — requires database auditing, SIEM integration, and alert management.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 4 — Secure Configuration of Enterprise Assets and Software
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 4,
      title: 'Secure Configuration of Enterprise Assets and Software',
      definition: 'Establish and maintain the secure configuration of enterprise assets (end-user devices, network devices, non-computing/IoT devices, and servers) and software (operating systems and applications).',
      purpose: 'Prevent attackers from exploiting vulnerable services and settings by ensuring all assets are configured according to security best practices, reducing the default attack surface.',
      safeguards: [
        {
          id: '4.1', title: 'Establish and Maintain a Secure Configuration Process',
          definition: 'Establish and maintain a secure configuration process for enterprise assets and software. Review and update documentation annually, or when significant enterprise changes occur.',
          purpose: 'Define a repeatable process for hardening assets so configurations are consistent and aligned with security best practices.',
          why: 'Default configurations are often insecure. A formal process ensures all assets start from a hardened baseline.',
          ig1: { scope: 'Create basic secure configuration standards.', approach: 'Document secure configuration baselines for key asset types using CIS Benchmarks or vendor guidance.', example: 'A small business documents a standard OS configuration checklist for all new Windows workstations.', resources: 'Minimal — uses free CIS Benchmarks.' },
          ig2: { scope: 'Automated secure configuration management.', approach: 'Use configuration management tools (e.g., Ansible, SCCM, GPO) to automate deployment and monitoring of secure baselines.', example: 'A mid-sized company uses Group Policy to enforce secure settings across all domain-joined systems.', resources: 'Moderate — requires configuration management tooling.' },
          ig3: { scope: 'Continuous configuration compliance monitoring.', approach: 'Deploy compliance scanning tools integrated with SIEM to continuously monitor and remediate configuration drift.', example: 'An enterprise uses Tenable.sc to continuously scan for configuration drift against CIS Benchmarks and auto-remediates via Ansible.', resources: 'Significant — requires compliance scanning and automation platforms.' },
        },
        {
          id: '4.2', title: 'Establish and Maintain a Secure Configuration Process for Network Infrastructure',
          definition: 'Establish and maintain a secure configuration process for network infrastructure. Review and update documentation annually.',
          purpose: 'Ensure network devices (routers, switches, firewalls) are hardened against attacks and misconfigurations.',
          why: 'Network device misconfigurations are a common cause of breaches and can provide attackers with access to entire network segments.',
          ig1: { scope: 'Basic network device hardening.', approach: 'Apply vendor-recommended security settings to network devices. Change default credentials and disable unnecessary services.', example: 'A small business changes default passwords on all routers and disables unused ports.', resources: 'Minimal — manual configuration.' },
          ig2: { scope: 'Standardized network configuration management.', approach: 'Use network configuration management tools to maintain and enforce secure baselines across all network devices.', example: 'A mid-sized company uses SolarWinds NCM to backup, compare, and enforce network device configurations.', resources: 'Moderate — requires network management tools.' },
          ig3: { scope: 'Continuous network configuration compliance.', approach: 'Implement infrastructure-as-code for network devices with continuous compliance monitoring and automated remediation.', example: 'An enterprise uses Cisco DNA Center for automated compliance checks and configuration enforcement across all network infrastructure.', resources: 'Significant — requires enterprise network management platform.' },
        },
        {
          id: '4.3', title: 'Configure Automatic Session Locking on Enterprise Assets',
          definition: 'Configure automatic session locking on enterprise assets after a defined period of inactivity. For general purpose OS, the period must not exceed 15 minutes. For mobile devices, not more than 2 minutes.',
          purpose: 'Prevent unauthorized access to unattended devices by automatically locking sessions after inactivity.',
          why: 'Unattended, unlocked devices are an easy target for unauthorized access, especially in shared or public spaces.',
          ig1: { scope: 'Enable automatic session locking.', approach: 'Configure screen lock timeout on all devices (15 min for desktops, 2 min for mobile).', example: 'A small business sets Windows screen lock to 10 minutes via local policy.', resources: 'Minimal — built-in OS settings.' },
          ig2: { scope: 'Policy-enforced session locking.', approach: 'Enforce session lock via Group Policy, MDM, or endpoint management tools with compliance monitoring.', example: 'A mid-sized company uses Intune to enforce 5-minute screen lock on all managed devices.', resources: 'Moderate — requires endpoint management.' },
          ig3: { scope: 'Comprehensive session management.', approach: 'Enforce session locking across all platforms with automated compliance verification and exception reporting.', example: 'An enterprise enforces session lock policies via GPO and Intune with automated compliance dashboards.', resources: 'Significant — requires unified endpoint management.' },
        },
        {
          id: '4.4', title: 'Implement and Manage a Firewall on Servers',
          definition: 'Implement and manage a firewall on servers, where supported. Example implementations include a virtual firewall, operating system firewall, or a third-party firewall agent.',
          purpose: 'Control network traffic to and from servers, blocking unauthorized connections and reducing the attack surface.',
          why: 'Servers are high-value targets. Host-based firewalls provide defense-in-depth beyond network firewalls.',
          ig1: { scope: 'Enable host-based firewalls on servers.', approach: 'Enable and configure the built-in OS firewall (e.g., Windows Firewall, iptables) on all servers.', example: 'A small business enables Windows Firewall on its file server, allowing only necessary ports.', resources: 'Minimal — built-in OS features.' },
          ig2: { scope: 'Managed server firewall policies.', approach: 'Centrally manage server firewall rules through configuration management tools with standardized rule sets.', example: 'A mid-sized company uses Ansible to deploy and manage iptables rules across all Linux servers.', resources: 'Moderate — requires configuration management.' },
          ig3: { scope: 'Advanced server firewall with micro-segmentation.', approach: 'Deploy advanced host-based firewalls with micro-segmentation capabilities and integrate with SIEM for monitoring.', example: 'An enterprise uses Illumio for micro-segmentation with firewall rules enforced per workload and integrated with Splunk.', resources: 'Significant — requires micro-segmentation platform.' },
        },
        {
          id: '4.5', title: 'Implement and Manage a Firewall on End-User Devices',
          definition: 'Implement and manage a host-based firewall or port-filtering tool on end-user devices, with a default-deny rule that drops all traffic except those services and ports explicitly allowed.',
          purpose: 'Protect endpoints from unauthorized network connections and lateral movement within the network.',
          why: 'Endpoints are the most common initial attack vector. Host firewalls limit what attackers can reach even after compromising a device.',
          ig1: { scope: 'Enable firewalls on all end-user devices.', approach: 'Ensure built-in OS firewalls are enabled on all workstations and laptops with default-deny inbound rules.', example: 'A small business verifies Windows Firewall is enabled on all PCs during setup.', resources: 'Minimal — built-in OS features.' },
          ig2: { scope: 'Centrally managed endpoint firewalls.', approach: 'Use Group Policy or endpoint management to enforce firewall policies and monitor compliance across all endpoints.', example: 'A mid-sized company uses GPO to enforce Windows Firewall with custom rule sets and blocks peer-to-peer traffic.', resources: 'Moderate — requires endpoint management.' },
          ig3: { scope: 'Advanced endpoint firewall with application awareness.', approach: 'Deploy next-gen endpoint firewalls with application-level filtering and real-time policy updates based on threat intelligence.', example: 'An enterprise uses EDR-integrated firewalls that dynamically block suspicious outbound connections.', resources: 'Significant — requires advanced endpoint protection platform.' },
        },
        {
          id: '4.6', title: 'Securely Manage Enterprise Assets and Software',
          definition: 'Securely manage enterprise assets and software. Example implementations include managing configuration through version-controlled infrastructure-as-code and accessing administrative interfaces over secure protocols such as SSH and HTTPS.',
          purpose: 'Ensure administrative access and configuration changes are performed securely, preventing interception or tampering.',
          why: 'Insecure management protocols expose credentials and configuration data to interception, enabling attackers to take control of systems.',
          ig1: { scope: 'Use secure protocols for management.', approach: 'Use SSH instead of Telnet, HTTPS instead of HTTP for all administrative access. Disable insecure management protocols.', example: 'A small business configures its router to accept only HTTPS management connections.', resources: 'Minimal — protocol configuration.' },
          ig2: { scope: 'Enforce secure management practices.', approach: 'Implement jump servers/bastion hosts for administrative access with secure protocol enforcement and session logging.', example: 'A mid-sized company routes all administrative access through a bastion host with SSH key authentication.', resources: 'Moderate — requires bastion host and access controls.' },
          ig3: { scope: 'Privileged access management with full audit.', approach: 'Deploy privileged access management (PAM) solutions with session recording, just-in-time access, and credential vaulting.', example: 'An enterprise uses CyberArk for all privileged access with session recording and automatic credential rotation.', resources: 'Significant — requires PAM platform.' },
        },
        {
          id: '4.7', title: 'Manage Default Accounts on Enterprise Assets and Software',
          definition: 'Manage default accounts on enterprise assets and software, such as root, administrator, and other pre-configured vendor accounts. Example implementations include disabling default accounts or making them unusable.',
          purpose: 'Prevent attackers from using well-known default credentials to gain unauthorized access.',
          why: 'Default accounts with known credentials are one of the easiest attack vectors. Attackers routinely scan for and exploit default accounts.',
          ig1: { scope: 'Disable or rename default accounts.', approach: 'Change passwords on all default accounts. Disable or rename default admin accounts where possible.', example: 'A small business renames the default "admin" account on all systems and sets strong passwords.', resources: 'Minimal — manual configuration.' },
          ig2: { scope: 'Automated default account management.', approach: 'Use configuration management to ensure default accounts are disabled or renamed across all assets. Scan for default credentials.', example: 'A mid-sized company uses Ansible to disable default accounts on all new server deployments.', resources: 'Moderate — requires configuration management.' },
          ig3: { scope: 'Continuous default account monitoring.', approach: 'Continuously scan for default credentials and accounts, integrate with vulnerability management and compliance reporting.', example: 'An enterprise uses vulnerability scanners to detect default credentials and automatically creates remediation tickets.', resources: 'Significant — requires vulnerability scanning and automated remediation.' },
        },
        {
          id: '4.8', title: 'Uninstall or Disable Unnecessary Services on Enterprise Assets and Software',
          definition: 'Uninstall or disable unnecessary services on enterprise assets and software, such as unused file sharing services, web application modules, or service functions.',
          purpose: 'Reduce the attack surface by removing services that are not needed for business operations.',
          why: 'Every running service is a potential attack vector. Unnecessary services increase risk without business benefit.',
          ...ig(null,
            { scope: 'Identify and disable unnecessary services.', approach: 'Review running services on all systems and disable those not required for business operations. Document exceptions.', example: 'A mid-sized company disables IIS on workstations and removes unused Windows features across endpoints.', resources: 'Moderate — requires service inventory and review.' },
            { scope: 'Automated service hardening.', approach: 'Use configuration baselines to automatically remove or disable non-essential services and continuously monitor for drift.', example: 'An enterprise uses hardened golden images and compliance scanning to ensure only approved services are running.', resources: 'Significant — requires golden image management and compliance scanning.' }),
        },
        {
          id: '4.9', title: 'Configure Trusted DNS Servers on Enterprise Assets',
          definition: 'Configure trusted DNS servers on enterprise assets. Example implementations include configuring assets to use enterprise-controlled DNS servers and/or reputable externally accessible DNS servers.',
          purpose: 'Prevent DNS-based attacks such as DNS poisoning, hijacking, or redirection to malicious sites.',
          why: 'DNS is critical infrastructure. Compromised DNS can redirect users to phishing sites or block access to security updates.',
          ...ig(null,
            { scope: 'Configure trusted DNS servers.', approach: 'Configure all enterprise assets to use enterprise DNS servers or trusted public DNS (e.g., 1.1.1.1, 8.8.8.8) with DNS-over-HTTPS/TLS.', example: 'A mid-sized company configures all devices via DHCP to use internal DNS servers with forwarders to Cloudflare DNS.', resources: 'Moderate — requires DNS infrastructure configuration.' },
            { scope: 'DNS security with monitoring.', approach: 'Deploy enterprise DNS with DNSSEC, DNS logging, and integration with threat intelligence for malicious domain detection.', example: 'An enterprise uses Infoblox with threat intelligence feeds and DNS query logging integrated with SIEM.', resources: 'Significant — requires enterprise DNS security platform.' }),
        },
        {
          id: '4.10', title: 'Enforce Automatic Device Lockout on Portable End-User Devices',
          definition: 'Enforce automatic device lockout following a predetermined threshold of local failed authentication attempts on portable devices. For laptops, no more than 20 failed attempts; for mobile devices, no more than 10.',
          purpose: 'Prevent brute-force password attacks against portable devices that may be in the physical possession of an attacker.',
          why: 'Lost or stolen devices can be subjected to brute-force attacks. Lockout policies limit the effectiveness of such attacks.',
          ...ig(null,
            { scope: 'Enforce device lockout policies.', approach: 'Configure device lockout thresholds via MDM or Group Policy on all portable devices.', example: 'A mid-sized company uses Intune to enforce 10-attempt lockout on mobile devices and 20-attempt lockout on laptops.', resources: 'Moderate — requires MDM or endpoint management.' },
            { scope: 'Comprehensive lockout with remote response.', approach: 'Enforce lockout policies with automated notifications to security team and integration with remote wipe capabilities.', example: 'An enterprise enforces device lockout with automatic security team notification and conditional remote wipe after threshold.', resources: 'Significant — requires MDM with automated response.' }),
        },
        {
          id: '4.11', title: 'Enforce Remote Wipe Capability on Portable End-User Devices',
          definition: 'Remotely wipe enterprise data from enterprise-owned portable end-user devices when deemed appropriate, such as lost or stolen devices, or when an individual no longer supports the enterprise.',
          purpose: 'Enable rapid response to lost or stolen devices by remotely erasing enterprise data to prevent unauthorized access.',
          why: 'Remote wipe is a critical incident response capability for mobile and portable devices that may contain sensitive data.',
          ...ig(null,
            { scope: 'Enable remote wipe capability.', approach: 'Deploy MDM solutions that support remote wipe on all portable devices. Document and test the wipe process.', example: 'A mid-sized company enrolls all laptops and phones in Intune with remote wipe enabled and tested quarterly.', resources: 'Moderate — requires MDM platform.' },
            { scope: 'Automated remote wipe with policy integration.', approach: 'Integrate remote wipe with incident response workflows and identity management for automatic wipe on employee termination.', example: 'An enterprise auto-triggers remote wipe when a device is reported stolen or an employee is terminated in the HR system.', resources: 'Significant — requires MDM-HR-IdM integration.' }),
        },
        {
          id: '4.12', title: 'Separate Enterprise Workspaces on Mobile End-User Devices',
          definition: 'Ensure separate enterprise workspaces are used on mobile end-user devices, where supported. Example implementations include Apple Configuration Profile or Android Work Profile.',
          purpose: 'Isolate enterprise data from personal data on BYOD or mixed-use mobile devices to enable selective wipe and data protection.',
          why: 'Without workspace separation, enterprise data may leak to personal apps, and personal data may be inadvertently wiped during enterprise data removal.',
          ...ig(null,
            { scope: 'Implement workspace separation on mobile devices.', approach: 'Configure work profiles (Android) or managed containers (iOS) via MDM to separate enterprise and personal data.', example: 'A mid-sized company uses Android Work Profile and Apple managed apps to isolate enterprise email and documents.', resources: 'Moderate — requires MDM configuration.' },
            { scope: 'Comprehensive mobile workspace management.', approach: 'Deploy enterprise mobility management with containerization, app-level VPN, and DLP policies within the work container.', example: 'An enterprise uses VMware Workspace ONE with per-app VPN and DLP within the managed container.', resources: 'Significant — requires enterprise mobility management.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 5 — Account Management
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 5,
      title: 'Account Management',
      definition: 'Use processes and tools to assign and manage authorization to credentials for user accounts, including administrator accounts, as well as service accounts, to enterprise assets and software.',
      purpose: 'Ensure only authorized users have active accounts, that accounts are properly managed throughout their lifecycle, and that privileged access is tightly controlled.',
      safeguards: [
        {
          id: '5.1', title: 'Establish and Maintain an Inventory of Accounts',
          definition: 'Establish and maintain an inventory of all accounts managed in the enterprise. The inventory must include both user and administrator accounts. Validate that all active accounts are authorized, at minimum quarterly.',
          purpose: 'Provide visibility into all accounts to detect unauthorized, orphaned, or excessive accounts that increase risk.',
          why: 'Unknown or unmanaged accounts are a significant risk — they can be exploited for unauthorized access without detection.',
          ig1: { scope: 'Create a basic account inventory.', approach: 'Maintain a list of all user and admin accounts with owner, creation date, and department. Review quarterly.', example: 'A small business maintains a spreadsheet of all active accounts and reviews it each quarter.', resources: 'Minimal — manual documentation.' },
          ig2: { scope: 'Automated account inventory management.', approach: 'Use directory services or identity management tools to maintain an automated, up-to-date account inventory with regular reviews.', example: 'A mid-sized company uses AD reports to generate monthly account inventories and flags accounts without recent logins.', resources: 'Moderate — requires directory services reporting.' },
          ig3: { scope: 'Continuous account lifecycle management.', approach: 'Implement identity governance tools with automated account discovery, lifecycle management, and continuous access reviews.', example: 'An enterprise uses SailPoint to continuously discover accounts, correlate with HR data, and flag orphaned accounts.', resources: 'Significant — requires identity governance platform.' },
        },
        {
          id: '5.2', title: 'Use Unique Passwords',
          definition: 'Use unique passwords for all enterprise assets. Best practice includes at minimum an 8-character password for accounts using MFA and a 14-character password for accounts not using MFA.',
          purpose: 'Prevent credential-stuffing attacks and limit the impact of any single credential compromise.',
          why: 'Password reuse is a top cause of account compromise. When one service is breached, reused passwords expose all linked accounts.',
          ig1: { scope: 'Enforce password uniqueness and complexity.', approach: 'Implement password policies requiring minimum length and discourage password reuse. Provide password manager guidance.', example: 'A small business requires 14-character passwords and recommends a password manager for all staff.', resources: 'Minimal — policy and training.' },
          ig2: { scope: 'Enterprise password management.', approach: 'Deploy an enterprise password manager and enforce password policies via directory services. Check against breach databases.', example: 'A mid-sized company deploys 1Password for Business and configures Azure AD to reject known-breached passwords.', resources: 'Moderate — requires password manager and directory configuration.' },
          ig3: { scope: 'Advanced credential management.', approach: 'Combine enterprise password management with passwordless authentication, credential monitoring, and automated rotation for service accounts.', example: 'An enterprise implements FIDO2 passwordless auth with CyberArk for automated service account password rotation.', resources: 'Significant — requires advanced identity infrastructure.' },
        },
        {
          id: '5.3', title: 'Disable Dormant Accounts',
          definition: 'Delete or disable any dormant accounts after a period of 45 days of inactivity, where supported.',
          purpose: 'Reduce the attack surface by removing accounts that are no longer actively used and could be exploited.',
          why: 'Dormant accounts are attractive targets for attackers because suspicious activity is less likely to be noticed.',
          ig1: { scope: 'Identify and disable dormant accounts.', approach: 'Periodically review account activity and disable accounts inactive for 45+ days.', example: 'A small business reviews login records quarterly and disables accounts for departed employees.', resources: 'Minimal — manual review.' },
          ig2: { scope: 'Automated dormant account detection.', approach: 'Configure directory services to automatically flag or disable accounts after 45 days of inactivity.', example: 'A mid-sized company uses a PowerShell script to automatically disable AD accounts inactive for 45 days.', resources: 'Moderate — requires scripting or directory service configuration.' },
          ig3: { scope: 'Continuous dormant account management.', approach: 'Use identity governance tools to continuously monitor account activity and automatically disable dormant accounts with audit logging.', example: 'An enterprise uses SailPoint to auto-disable dormant accounts and creates audit records for compliance.', resources: 'Significant — requires identity governance platform.' },
        },
        {
          id: '5.4', title: 'Restrict Administrator Privileges to Dedicated Administrator Accounts',
          definition: 'Restrict administrator privileges to dedicated administrator accounts on enterprise assets. Conduct general computing activities from the user\'s primary, non-privileged account.',
          purpose: 'Limit the exposure of administrative credentials during routine activities like browsing and email.',
          why: 'Using admin accounts for daily activities exposes elevated privileges to phishing, malware, and other attacks.',
          ig1: { scope: 'Separate admin and user accounts.', approach: 'Create dedicated admin accounts separate from daily-use accounts. Use admin accounts only for administrative tasks.', example: 'A small business IT administrator uses a standard account for email and a separate admin account for server management.', resources: 'Minimal — account creation and policy.' },
          ig2: { scope: 'Enforce admin account separation.', approach: 'Use technical controls to prevent admin accounts from accessing email/internet and enforce separate accounts via Group Policy.', example: 'A mid-sized company uses GPO to prevent admin accounts from logging into workstations for general use.', resources: 'Moderate — requires Group Policy configuration.' },
          ig3: { scope: 'Privileged access workstations and PAM.', approach: 'Implement dedicated privileged access workstations (PAWs) and privileged access management (PAM) with just-in-time elevation.', example: 'An enterprise uses hardened PAWs with CyberArk for just-in-time admin access with session recording.', resources: 'Significant — requires PAW infrastructure and PAM platform.' },
        },
        {
          id: '5.5', title: 'Establish and Maintain an Inventory of Service Accounts',
          definition: 'Establish and maintain an inventory of service accounts. The inventory must contain department owner, review date, and purpose. Perform service account reviews at minimum quarterly.',
          purpose: 'Track and manage non-human accounts used by applications and services to prevent them from becoming unmanaged security risks.',
          why: 'Service accounts often have elevated privileges and rarely change passwords, making them high-value targets.',
          ...ig(null,
            { scope: 'Inventory and review service accounts.', approach: 'Document all service accounts with their purpose, owner, and privilege level. Review quarterly to validate necessity.', example: 'A mid-sized company maintains a service account registry and reviews ownership and necessity each quarter.', resources: 'Moderate — requires documentation and review process.' },
            { scope: 'Automated service account management.', approach: 'Use PAM tools to discover, vault, and automatically rotate service account credentials with continuous monitoring.', example: 'An enterprise uses CyberArk to vault all service account credentials with automatic 30-day rotation.', resources: 'Significant — requires PAM platform.' }),
        },
        {
          id: '5.6', title: 'Centralize Account Management',
          definition: 'Centralize account management through a directory or identity service.',
          purpose: 'Simplify account lifecycle management and enable consistent policy enforcement across all enterprise assets.',
          why: 'Decentralized accounts are difficult to audit, manage, and secure consistently across the organization.',
          ...ig(null,
            { scope: 'Centralize accounts in a directory service.', approach: 'Migrate all accounts to a centralized directory (e.g., Active Directory, Azure AD, Okta) for unified management.', example: 'A mid-sized company migrates all application accounts to Azure AD with SSO for centralized management.', resources: 'Moderate — requires directory service deployment.' },
            { scope: 'Comprehensive identity platform.', approach: 'Implement enterprise identity platform with federation, SSO, automated provisioning/deprovisioning, and cross-platform integration.', example: 'An enterprise uses Okta with SCIM provisioning to automatically manage accounts across 50+ SaaS and on-prem applications.', resources: 'Significant — requires enterprise identity platform.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 6 — Access Control Management
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 6,
      title: 'Access Control Management',
      definition: 'Use processes and tools to create, assign, manage, and revoke access credentials and privileges for user, administrator, and service accounts for enterprise assets and software.',
      purpose: 'Ensure that only authorized users have access to resources they need, following the principle of least privilege, and that access is promptly revoked when no longer needed.',
      safeguards: [
        {
          id: '6.1', title: 'Establish an Access Granting Process',
          definition: 'Establish and follow a process, preferably automated, for granting access to enterprise assets upon new hire, rights grant, or role change of a user.',
          purpose: 'Ensure access is granted in a controlled, documented manner aligned with job responsibilities.',
          why: 'Ad-hoc access granting leads to excessive permissions, inconsistent access, and difficulty auditing who has access to what.',
          ig1: { scope: 'Define a basic access granting process.', approach: 'Document a process for requesting and approving access during onboarding or role changes.', example: 'A small business requires manager approval via email before IT grants access to shared drives.', resources: 'Minimal — process documentation.' },
          ig2: { scope: 'Automated access provisioning.', approach: 'Implement automated provisioning workflows through identity management tools tied to HR systems.', example: 'A mid-sized company uses Azure AD with role-based group membership that auto-provisions app access on hire.', resources: 'Moderate — requires identity management tooling.' },
          ig3: { scope: 'Full identity governance with automated provisioning.', approach: 'Deploy identity governance and administration (IGA) with automated provisioning, approval workflows, and compliance reporting.', example: 'An enterprise uses SailPoint IGA to auto-provision access based on role catalogs with multi-level approval workflows.', resources: 'Significant — requires IGA platform.' },
        },
        {
          id: '6.2', title: 'Establish an Access Revoking Process',
          definition: 'Establish and follow a process, preferably automated, for revoking access to enterprise assets through disabling accounts immediately upon termination, rights revocation, or role change.',
          purpose: 'Ensure access is promptly removed when no longer authorized to prevent ex-employees or role-changed users from retaining inappropriate access.',
          why: 'Delayed access revocation is a major security risk — terminated employees with active accounts can cause significant damage.',
          ig1: { scope: 'Define a basic access revocation process.', approach: 'Document a process for immediately disabling accounts upon employee termination or role change.', example: 'A small business has IT disable accounts within 24 hours of receiving termination notice from HR.', resources: 'Minimal — process documentation.' },
          ig2: { scope: 'Automated access revocation.', approach: 'Integrate HR system with identity management to automatically disable accounts upon termination or role change.', example: 'A mid-sized company links BambooHR to Azure AD to auto-disable accounts on termination date.', resources: 'Moderate — requires HR-IdM integration.' },
          ig3: { scope: 'Real-time automated deprovisioning.', approach: 'Implement real-time deprovisioning across all systems with automated access reviews and orphaned account detection.', example: 'An enterprise uses Okta lifecycle management to instantly deprovision across all integrated apps upon HR system trigger.', resources: 'Significant — requires enterprise identity platform.' },
        },
        {
          id: '6.3', title: 'Require MFA for Externally-Exposed Applications',
          definition: 'Require all externally-exposed enterprise or third-party applications to enforce MFA, where supported. Enforcing MFA through a directory service or SSO provider is a satisfactory implementation.',
          purpose: 'Add a second layer of authentication for internet-facing applications to protect against credential theft and brute-force attacks.',
          why: 'Passwords alone are insufficient for externally-facing applications. MFA dramatically reduces the risk of account compromise.',
          ig1: { scope: 'Enable MFA for external applications.', approach: 'Enable MFA on all externally-facing applications such as email, VPN, and cloud services.', example: 'A small business enables MFA on Microsoft 365 and its VPN using authenticator apps.', resources: 'Minimal — most platforms include MFA.' },
          ig2: { scope: 'Enforced MFA via SSO.', approach: 'Implement SSO with mandatory MFA for all externally-exposed applications through a central identity provider.', example: 'A mid-sized company uses Okta SSO with mandatory MFA for all cloud applications.', resources: 'Moderate — requires SSO/IdP configuration.' },
          ig3: { scope: 'Phishing-resistant MFA everywhere.', approach: 'Deploy phishing-resistant MFA (e.g., FIDO2, hardware tokens) for all external applications with adaptive risk-based policies.', example: 'An enterprise requires FIDO2 hardware keys for all external access with risk-based step-up authentication.', resources: 'Significant — requires hardware tokens and adaptive MFA.' },
        },
        {
          id: '6.4', title: 'Require MFA for Remote Network Access',
          definition: 'Require MFA for remote network access.',
          purpose: 'Protect remote access to the corporate network from compromised credentials.',
          why: 'Remote access is a primary attack vector. MFA prevents attackers from using stolen credentials to access the network.',
          ig1: { scope: 'Enable MFA for VPN and remote access.', approach: 'Require MFA for all VPN connections and remote desktop access.', example: 'A small business enables MFA on its VPN gateway using TOTP codes.', resources: 'Minimal — VPN MFA configuration.' },
          ig2: { scope: 'Centralized MFA for all remote access.', approach: 'Enforce MFA for all remote access methods through a centralized authentication service.', example: 'A mid-sized company uses Duo MFA integrated with its VPN and remote desktop gateway.', resources: 'Moderate — requires MFA platform integration.' },
          ig3: { scope: 'Zero-trust remote access.', approach: 'Implement zero-trust network access (ZTNA) with continuous authentication and device posture assessment.', example: 'An enterprise replaces traditional VPN with Zscaler ZTNA requiring MFA, device compliance, and continuous verification.', resources: 'Significant — requires ZTNA platform.' },
        },
        {
          id: '6.5', title: 'Require MFA for Administrative Access',
          definition: 'Require MFA for all administrative access accounts, where supported, on all enterprise assets, whether managed on-site or through a third-party provider.',
          purpose: 'Add the strongest authentication for the highest-privilege accounts that can cause the most damage if compromised.',
          why: 'Administrative accounts are the highest-value targets. MFA is essential to prevent unauthorized administrative access.',
          ig1: { scope: 'Enable MFA for all admin accounts.', approach: 'Require MFA for all administrative logins including server admin, cloud admin, and network device management.', example: 'A small business enables MFA on its cloud admin accounts and server RDP access.', resources: 'Minimal — MFA configuration for admin accounts.' },
          ig2: { scope: 'Enforced admin MFA with monitoring.', approach: 'Enforce MFA for all administrative access through PAM or identity provider with logging and alerting on admin activities.', example: 'A mid-sized company requires Duo MFA for all admin access and logs all administrative sessions.', resources: 'Moderate — requires MFA and session logging.' },
          ig3: { scope: 'Hardware-based admin MFA with PAM.', approach: 'Require hardware-based MFA (FIDO2) for all administrative access combined with PAM and session recording.', example: 'An enterprise requires YubiKey authentication for all admin access through CyberArk with full session recording.', resources: 'Significant — requires hardware MFA and PAM platform.' },
        },
        {
          id: '6.6', title: 'Establish and Maintain an Inventory of Authentication and Authorization Systems',
          definition: 'Establish and maintain an inventory of the enterprise\'s authentication and authorization systems, including those hosted on-site or at a remote service provider. Review and update at minimum annually.',
          purpose: 'Ensure visibility into all systems that control access to enterprise resources for consistent security management.',
          why: 'Unknown authentication systems cannot be monitored or secured, creating blind spots in access control.',
          ...ig(null,
            { scope: 'Inventory authentication and authorization systems.', approach: 'Document all IdPs, directory services, SSO platforms, and local authentication systems with their scope and ownership.', example: 'A mid-sized company inventories its AD, Okta, and application-specific auth systems with responsible owners.', resources: 'Moderate — requires documentation and review.' },
            { scope: 'Comprehensive auth system inventory with monitoring.', approach: 'Maintain a real-time inventory integrated with security monitoring, including federated and third-party auth systems.', example: 'An enterprise maps all auth systems in ServiceNow CMDB and monitors authentication events across all systems in SIEM.', resources: 'Significant — requires comprehensive inventory and monitoring.' }),
        },
        {
          id: '6.7', title: 'Centralize Access Control',
          definition: 'Centralize access control for all enterprise assets through a directory service or SSO provider, where supported.',
          purpose: 'Enable consistent access policy enforcement, simplified management, and unified audit trail across all enterprise resources.',
          why: 'Decentralized access control leads to inconsistent policies, excessive access, and difficulty in auditing.',
          ...ig(null,
            { scope: 'Centralize access control via SSO.', approach: 'Implement SSO through a directory service or identity provider for all enterprise applications that support it.', example: 'A mid-sized company integrates all SaaS applications with Azure AD SSO for centralized access control.', resources: 'Moderate — requires SSO implementation.' },
            { scope: 'Enterprise-wide centralized access governance.', approach: 'Implement comprehensive identity governance with centralized access control, automated reviews, and cross-platform policy enforcement.', example: 'An enterprise uses Okta with governance module for centralized access across cloud, on-prem, and legacy applications.', resources: 'Significant — requires enterprise identity governance.' }),
        },
        {
          id: '6.8', title: 'Define and Maintain Role-Based Access Control',
          definition: 'Define and maintain role-based access control by determining and documenting the access rights necessary for each role. Perform access control reviews at minimum annually.',
          purpose: 'Standardize access management based on job roles rather than individual requests, simplifying administration and reducing excessive access.',
          why: 'Without RBAC, access accumulates over time as users change roles, leading to privilege creep and excessive permissions.',
          ...ig(null, null,
            { scope: 'Comprehensive RBAC implementation.', approach: 'Define role catalogs with documented access entitlements, implement automated role-based provisioning, and conduct regular access certifications.', example: 'An enterprise defines 200+ roles in SailPoint with mapped entitlements and conducts quarterly access certification campaigns.', resources: 'Significant — requires identity governance platform and role engineering.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 7 — Continuous Vulnerability Management
    // ════════════════════════════════════════════════════════════════════════════
    {
        id: 7,
        title: 'Continuous Vulnerability Management',
        definition: 'Develop a plan to continuously assess and track vulnerabilities on all enterprise assets within the enterprise’s infrastructure, in order to remediate, and minimize, the window of opportunity for attackers. Monitor public and private industry sources for new threat and vulnerability information.',
        purpose: 'To continuously identify, assess, and remediate vulnerabilities across enterprise assets to reduce the exposure window for potential attackers.',
        safeguards:
        [
            {
            id: '7.1', title: 'Establish and Maintain a Vulnerability Management Process',
            definition: 'Establish and maintain a documented vulnerability management process for enterprise assets. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.',
            purpose: 'Provide a structured framework for identifying, assessing, and remediating vulnerabilities.',
            why: 'Without a vulnerability management process, vulnerabilities may go unaddressed, increasing the risk of exploitation.',
            ...ig(
                { scope: 'Create a basic vulnerability management process.', approach: 'Document a simple process for identifying and remediating vulnerabilities using manual methods.', example: 'A small business documents a vulnerability management process and reviews it annually.', resources: 'Minimal — policy documentation only.' },
                { scope: 'Formalized vulnerability management with automation.', approach: 'Develop a comprehensive vulnerability management policy with automated scanning and remediation processes.', example: 'A mid-sized company creates a vulnerability governance policy and uses tools like Nessus for scanning.', resources: 'Moderate — requires policy development and scanning tools.' },
                { scope: 'Enterprise-wide vulnerability governance program.', approach: 'Implement a full vulnerability governance framework with automated scanning, prioritization, and integration with ticketing systems.', example: 'An enterprise uses Tenable for automated vulnerability management integrated with ServiceNow.', resources: 'Significant — requires vulnerability management tools and dedicated staff.' }
                ),
            },
            {
                id: '7.2', title: 'Establish and Maintain a Remediation Process',
                definition: 'Establish and maintain a risk-based remediation strategy documented in a remediation process, with monthly, or more frequent, reviews.',
                purpose: 'Ensure vulnerabilities are remediated based on risk priority.',
                why: 'Without a remediation process, vulnerabilities may not be addressed in a timely manner, leaving the organization exposed.',
                ...ig(
                    { scope: 'Basic remediation process.', approach: 'Document a simple risk-based remediation strategy and review it monthly.', example: 'A small business documents a remediation process and reviews it monthly.', resources: 'Minimal — manual process.' },
                    { scope: 'Automated remediation tracking.', approach: 'Implement a risk-based remediation process with automated tracking and monthly reviews.', example: 'A mid-sized company uses Jira to track remediation and reviews monthly.', resources: 'Moderate — requires ticketing tools.' },
                    { scope: 'Continuous remediation management.', approach: 'Deploy automated remediation workflows integrated with vulnerability scanners and ticketing systems.', example: 'An enterprise uses ServiceNow to automatically assign and track remediation tasks.', resources: 'Significant — requires integrated tools.' }
                ),
            },
            {
                id: '7.3', title: 'Perform Automated Operating System Patch Management',
                definition: 'Perform operating system updates on enterprise assets through automated patch management on a monthly, or more frequent, basis.',
                purpose: 'Ensure operating systems are patched to address known vulnerabilities.',
                why: 'Unpatched operating systems are a common entry point for attackers.',
                ...ig(
                    { scope: 'Basic OS patch management.', approach: 'Manually apply OS updates monthly.', example: 'A small business manually applies OS updates monthly.', resources: 'Minimal — manual effort.' },
                    { scope: 'Automated OS patch management.', approach: 'Use automated tools to apply OS updates monthly.', example: 'A mid-sized company uses WSUS to automate OS patches.', resources: 'Moderate — requires patch management tools.' },
                    { scope: 'Real-time OS patch management.', approach: 'Integrate patch management with continuous monitoring for real-time updates.', example: 'An enterprise uses Tanium for real-time OS patching.', resources: 'Significant — requires enterprise tools.' }
                ),
            },
            {
                id: '7.4', title: 'Perform Automated Application Patch Management',
                definition: 'Perform application updates on enterprise assets through automated patch management on a monthly, or more frequent, basis.',
                purpose: 'Ensure applications are patched to address known vulnerabilities.',
                why: 'Unpatched applications can be exploited by attackers.',
                ...ig(
                    { scope: 'Basic application patch management.', approach: 'Manually apply application updates monthly.', example: 'A small business manually updates applications monthly.', resources: 'Minimal — manual effort.' },
                    { scope: 'Automated application patch management.', approach: 'Use automated tools to apply application updates monthly.', example: 'A mid-sized company uses PDQ Deploy for application patches.', resources: 'Moderate — requires patch management tools.' },
                    { scope: 'Real-time application patch management.', approach: 'Integrate patch management with continuous monitoring for real-time updates.', example: 'An enterprise uses BigFix for real-time application patching.', resources: 'Significant — requires enterprise tools.' }
                ),
            },
            {
                id: '7.5', title: 'Perform Automated Vulnerability Scans of Internal Enterprise Assets',
                definition: 'Perform automated vulnerability scans of internal enterprise assets on a quarterly, or more frequent, basis. Conduct both authenticated and unauthenticated scans.',
                purpose: 'Identify vulnerabilities in internal assets through regular scanning.',
                why: 'Unidentified vulnerabilities in internal assets can be exploited by attackers who have gained initial access.',
                ...ig(null,
                    { scope: 'Automated internal vulnerability scanning.', approach: 'Deploy tools to scan internal assets quarterly, using both authenticated and unauthenticated methods.', example: 'A mid-sized company uses Nessus to scan internal assets quarterly.', resources: 'Moderate — requires scanning tools.' },
                    { scope: 'Continuous internal vulnerability scanning.', approach: 'Integrate scanning with SIEM for continuous monitoring and alerting.', example: 'An enterprise uses Qualys for continuous internal scanning integrated with Splunk.', resources: 'Significant — requires enterprise tools.' }
                ),
            },
            {
                id: '7.6', title: 'Perform Automated Vulnerability Scans of Externally-Exposed Enterprise Assets',
                definition: 'Perform automated vulnerability scans of externally-exposed enterprise assets. Perform scans on a monthly, or more frequent, basis.',
                purpose: 'Identify vulnerabilities in externally-exposed assets through regular scanning.',
                why: 'Externally-exposed assets are prime targets for attackers.',
                ...ig(null,
                    { scope: 'Automated external vulnerability scanning.', approach: 'Deploy tools to scan externally-exposed assets monthly.', example: 'A mid-sized company uses OpenVAS to scan external assets monthly.', resources: 'Moderate — requires scanning tools.' },
                    { scope: 'Continuous external vulnerability scanning.', approach: 'Use cloud-based scanning services for continuous monitoring.', example: 'An enterprise uses Tenable.io for continuous external scanning.', resources: 'Significant — requires enterprise tools.' }
                ),
            },
            {
                id: '7.7', title: 'Remediate Detected Vulnerabilities',
                definition: 'Remediate detected vulnerabilities in software through processes and tooling on a monthly, or more frequent, basis, based on the remediation process.',
                purpose: 'Ensure identified vulnerabilities are remediated in a timely manner.',
                why: 'Unremediated vulnerabilities can be exploited by attackers.',
                ...ig(null,
                    { scope: 'Automated vulnerability remediation.', approach: 'Use tools to remediate vulnerabilities monthly based on risk.', example: 'A mid-sized company uses Ansible to automate remediation.', resources: 'Moderate — requires automation tools.' },
                    { scope: 'Enterprise vulnerability remediation.', approach: 'Integrate remediation with ticketing systems for prioritized fixing.', example: 'An enterprise uses ServiceNow to track and remediate vulnerabilities.', resources: 'Significant — requires integrated tools.' }
                ),
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 8 — Audit Log Management
    // ════════════════════════════════════════════════════════════════════════════
    {
        id: 8,
        title: 'Audit Log Management',
        definition: 'Collect, alert, review, and retain audit logs of events that could help detect, understand, or recover from an attack.',
        purpose: 'To enable quick detection of malicious activity, provide evidence of attacks, and support incident response and forensic investigations through comprehensive log collection and analysis.',
        safeguards: 
        [
            {
                id: '8.1', title: 'Establish and Maintain an Audit Log Management Process',
                definition: 'Establish and maintain a documented audit log management process that defines the enterprise’s logging requirements. At a minimum, address the collection, review, and retention of audit logs for enterprise assets. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.',
                purpose: 'Provide a structured framework for logging, reviewing, and retaining audit logs.',
                why: 'Without an audit log management process, important events may not be logged or reviewed, hindering incident detection and response.',
                ...ig(
                    { scope: 'Create a basic audit log management process.', approach: 'Document a simple logging policy covering key assets and events.', example: 'A small business documents logging requirements for servers and reviews annually.', resources: 'Minimal — policy documentation only.' },
                    { scope: 'Formalized audit log management with centralization.', approach: 'Develop a comprehensive logging policy with centralized collection and monthly reviews.', example: 'A mid-sized company creates a logging policy and uses ELK Stack for centralization.', resources: 'Moderate — requires logging tools.' },
                    { scope: 'Enterprise-wide log management program.', approach: 'Implement a full log management framework with automated collection, analysis, and retention.', example: 'An enterprise uses Splunk for automated log management across all assets.', resources: 'Significant — requires SIEM tools and dedicated staff.' }
                ),
            },
            {
                id: '8.2', title: 'Collect Audit Logs',
                definition: 'Collect audit logs. Ensure that logging, per the enterprise’s audit log management process, has been enabled across enterprise assets.',
                purpose: 'Ensure key events are logged for detection and analysis.',
                why: 'Without collecting logs, there is no data for incident investigation or threat detection.',
                ...ig(
                    { scope: 'Basic log collection.', approach: 'Enable logging on key assets manually.', example: 'A small business enables logging on servers and routers.', resources: 'Minimal — built-in features.' },
                    { scope: 'Automated log collection.', approach: 'Use tools to collect logs from all assets.', example: 'A mid-sized company uses Syslog to collect logs.', resources: 'Moderate — requires logging tools.' },
                    { scope: 'Comprehensive log collection.', approach: 'Integrate logging with SIEM for all assets.', example: 'An enterprise uses LogRhythm for comprehensive log collection.', resources: 'Significant — requires SIEM.' }
                ),
            },
            {
                id: '8.3', title: 'Ensure Adequate Audit Log Storage',
                definition: 'Ensure that logging destinations maintain adequate storage to comply with the enterprise’s audit log management process.',
                purpose: 'Ensure logs are retained for the required period.',
                why: 'Insufficient storage can lead to loss of critical log data.',
                ...ig(
                    { scope: 'Basic log storage.', approach: 'Allocate sufficient storage for logs.', example: 'A small business allocates storage for 90 days of logs.', resources: 'Minimal — manual allocation.' },
                    { scope: 'Managed log storage.', approach: 'Use tools to manage log storage.', example: 'A mid-sized company uses Graylog to manage storage.', resources: 'Moderate — requires storage tools.' },
                    { scope: 'Enterprise log storage.', approach: 'Use scalable storage solutions.', example: 'An enterprise uses AWS S3 for scalable log storage.', resources: 'Significant — requires cloud storage.' }
                ),
            },
            {
                id: '8.4', title: 'Standardize Time Synchronization',
                definition: 'Standardize time synchronization. Configure at least two synchronized time sources across enterprise assets, where supported.',
                purpose: 'Ensure consistent time stamps for log correlation.',
                why: 'Inconsistent time stamps can hinder incident investigation.',
                ...ig(null,
                    { scope: 'Basic time synchronization.', approach: 'Configure NTP on key assets.', example: 'A mid-sized company configures NTP on servers.', resources: 'Moderate — requires NTP configuration.' },
                    { scope: 'Enterprise time synchronization.', approach: 'Use multiple NTP sources integrated with logging.', example: 'An enterprise uses Stratum 1 NTP servers.', resources: 'Significant — requires NTP infrastructure.' }
                ),
            },
            {
                id: '8.5', title: 'Collect Detailed Audit Logs',
                definition: 'Configure detailed audit logging for enterprise assets containing sensitive data. Include event source, date, username, timestamp, source addresses, destination addresses, and other useful elements that could assist in a forensic investigation.',
                purpose: 'Provide detailed logs for forensic analysis.',
                why: 'Detailed logs are essential for understanding incidents.',
                ...ig(null,
                    { scope: 'Detailed logging for sensitive assets.', approach: 'Enable detailed logging on sensitive systems.', example: 'A mid-sized company enables detailed logging on databases.', resources: 'Moderate — requires logging configuration.' },
                    { scope: 'Comprehensive detailed logging.', approach: 'Integrate detailed logging with SIEM.', example: 'An enterprise uses Splunk for detailed logging.', resources: 'Significant — requires SIEM.' }
                ),
            },
            {
                id: '8.6', title: 'Collect DNS Query Audit Logs',
                definition: 'Collect DNS query audit logs on enterprise assets, where appropriate and supported.',
                purpose: 'Detect malicious DNS activity.',
                why: 'DNS logs can reveal command and control communications.',
                ...ig(null,
                    { scope: 'DNS log collection.', approach: 'Enable DNS logging on servers.', example: 'A mid-sized company enables DNS logging on bind servers.', resources: 'Moderate — requires DNS configuration.' },
                    { scope: 'Advanced DNS logging.', approach: 'Integrate DNS logs with SIEM.', example: 'An enterprise uses Infoblox for DNS logging.', resources: 'Significant — requires DNS tools.' }
                ),
            },
            {
                id: '8.7', title: 'Collect URL Request Audit Logs',
                definition: 'Collect URL request audit logs on enterprise assets, where appropriate and supported.',
                purpose: 'Detect malicious web activity.',
                why: 'URL logs can reveal data exfiltration or malware communications.',
                ...ig(null,
                    { scope: 'URL log collection.', approach: 'Enable URL logging on proxies.', example: 'A mid-sized company enables URL logging on Squid.', resources: 'Moderate — requires proxy configuration.' },
                    { scope: 'Advanced URL logging.', approach: 'Integrate URL logs with SIEM.', example: 'An enterprise uses Zscaler for URL logging.', resources: 'Significant — requires proxy tools.' }
                ),
            },
            {
                id: '8.8', title: 'Collect Command-Line Audit Logs',
                definition: 'Collect command-line audit logs. Example implementations include collecting audit logs from PowerShell®, BASH™, and remote administrative terminals.',
                purpose: 'Detect malicious command execution.',
                why: 'Command logs can reveal attacker actions.',
                ...ig(null,
                    { scope: 'Command log collection.', approach: 'Enable command logging on endpoints.', example: 'A mid-sized company enables PowerShell logging.', resources: 'Moderate — requires endpoint configuration.' },
                    { scope: 'Advanced command logging.', approach: 'Integrate command logs with SIEM.', example: 'An enterprise uses Sysmon for command logging.', resources: 'Significant — requires EDR.' }
                ),
            },
            {
                id: '8.9', title: 'Centralize Audit Logs',
                definition: 'Centralize, to the extent possible, audit log collection and retention across enterprise assets in accordance with the documented audit log management process. Example implementations include leveraging a SIEM tool to centralize multiple log sources.',
                purpose: 'Facilitate log correlation and analysis.',
                why: 'Centralized logs enable efficient incident detection.',
                ...ig(null,
                    { scope: 'Centralized log collection.', approach: 'Use tools to centralize logs.', example: 'A mid-sized company uses Logstash to centralize logs.', resources: 'Moderate — requires logging tools.' },
                    { scope: 'Enterprise centralized logging.', approach: 'Use SIEM for centralized logging.', example: 'An enterprise uses ArcSight for centralized logging.', resources: 'Significant — requires SIEM.' }
                ),
            },
            {
                id: '8.10', title: 'Retain Audit Logs',
                definition: 'Retain audit logs across enterprise assets for a minimum of 90 days.',
                purpose: 'Ensure logs are available for investigation.',
                why: 'Short retention can hinder long-term investigations.',
                ...ig(null,
                    { scope: 'Log retention for 90 days.', approach: 'Configure retention for 90 days.', example: 'A mid-sized company configures retention for 90 days.', resources: 'Moderate — requires storage.' },
                    { scope: 'Extended log retention.', approach: 'Retain logs for longer periods as per compliance.', example: 'An enterprise retains logs for 1 year.', resources: 'Significant — requires storage.' }
                ),
            },
            {
                id: '8.11', title: 'Conduct Audit Log Reviews',
                definition: 'Conduct reviews of audit logs to detect anomalies or abnormal events that could indicate a potential threat. Conduct reviews on a weekly, or more frequent, basis.',
                purpose: 'Detect threats through log analysis.',
                why: 'Unreviewed logs miss potential threats.',
                ...ig(null,
                    { scope: 'Weekly log reviews.', approach: 'Manually review logs weekly.', example: 'A mid-sized company reviews logs weekly.', resources: 'Moderate — manual effort.' },
                    { scope: 'Automated log reviews.', approach: 'Use SIEM for automated reviews.', example: 'An enterprise uses QRadar for automated reviews.', resources: 'Significant — requires SIEM.' }
                ),
            },
            {
                id: '8.12', title: 'Collect Service Provider Logs',
                definition: 'Collect service provider logs, where supported. Example implementations include collecting authentication and authorization events, data creation and disposal events, and user management events.',
                purpose: 'Monitor service provider activity.',
                why: 'Service provider logs can reveal supply chain attacks.',
                ...ig(null, null,
                    { scope: 'Service provider log collection.', approach: 'Collect logs from service providers.', example: 'An enterprise collects AWS CloudTrail logs.', resources: 'Significant — requires integration.' }
                ),
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 9 — Email and Web Browser Protections
    // ════════════════════════════════════════════════════════════════════════════
    {
        id: 9,
        title: 'Email and Web Browser Protections',
        definition: 'Improve protections and detections of threats from email and web vectors, as these are opportunities for attackers to manipulate human behavior through direct engagement.',
        purpose: 'To protect against threats from email and web browsers by implementing safeguards that reduce the risk of manipulation through these vectors.',
        safeguards: 
        [
            {
                id: '9.1', title: 'Ensure Use of Only Fully Supported Browsers and Email Clients',
                definition: 'Ensure only fully supported browsers and email clients are allowed to execute in the enterprise, only using the latest version of browsers and email clients provided through the vendor.',
                purpose: 'Prevent use of unsupported software that may have known vulnerabilities.',
                why: 'Unsupported browsers and email clients cannot receive security patches, increasing risk.',
                ...ig(
                    { scope: 'Basic supported software enforcement.', approach: 'Manually check and update browsers and email clients.', example: 'A small business manually updates browsers and email clients.', resources: 'Minimal — manual effort.' },
                    { scope: 'Automated supported software enforcement.', approach: 'Use tools to enforce use of supported versions.', example: 'A mid-sized company uses GPO to enforce supported browsers.', resources: 'Moderate — requires management tools.' },
                    { scope: 'Enterprise supported software management.', approach: 'Integrate with endpoint management for automatic enforcement.', example: 'An enterprise uses Intune to enforce supported versions.', resources: 'Significant — requires enterprise tools.' }
                ),
            },
            {
                id: '9.2', title: 'Use DNS Filtering Services',
                definition: 'Use DNS filtering services on all end-user devices, including remote and on-premises assets, to block access to known malicious domains.',
                purpose: 'Block access to malicious domains via DNS.',
                why: 'Malicious domains can lead to malware or phishing.',
                ...ig(
                    { scope: 'Basic DNS filtering.', approach: 'Use public DNS filters.', example: 'A small business uses OpenDNS.', resources: 'Minimal — free services.' },
                    { scope: 'Managed DNS filtering.', approach: 'Use enterprise DNS filters.', example: 'A mid-sized company uses Cisco Umbrella.', resources: 'Moderate — requires DNS tools.' },
                    { scope: 'Advanced DNS filtering.', approach: 'Integrate DNS filtering with threat intelligence.', example: 'An enterprise uses ThreatGrid for DNS filtering.', resources: 'Significant — requires intelligence feeds.' }
                ),
            },
            {
                id: '9.3', title: 'Maintain and Enforce Network-Based URL Filters',
                definition: 'Enforce and update network-based URL filters to limit an enterprise asset from connecting to potentially malicious or unapproved websites. Example implementations include category-based filtering, reputation-based filtering, or through the use of block lists. Enforce filters for all enterprise assets.',
                purpose: 'Limit access to malicious or unapproved websites.',
                why: 'Malicious websites can deliver malware or phishing.',
                ...ig(null,
                    { scope: 'Network-based URL filtering.', approach: 'Use proxy for URL filtering.', example: 'A mid-sized company uses Squid for URL filtering.', resources: 'Moderate — requires proxy.' },
                    { scope: 'Advanced URL filtering.', approach: 'Use next-gen firewall for URL filtering.', example: 'An enterprise uses Palo Alto for URL filtering.', resources: 'Significant — requires firewall.' }
                ),
            },
            {
                id: '9.4', title: 'Restrict Unnecessary or Unauthorized Browser and Email Client Extensions',
                definition: 'Restrict, either through uninstalling or disabling, any unauthorized or unnecessary browser or email client plugins, extensions, and add-on applications.',
                purpose: 'Prevent malicious extensions from compromising browsers or email clients.',
                why: 'Unauthorized extensions can contain malware or vulnerabilities.',
                ...ig(null,
                    { scope: 'Extension restriction.', approach: 'Manually disable unauthorized extensions.', example: 'A mid-sized company manually disables extensions.', resources: 'Moderate — manual effort.' },
                    { scope: 'Automated extension management.', approach: 'Use tools to manage extensions.', example: 'An enterprise uses GPO to manage extensions.', resources: 'Significant — requires management tools.' }
                ),
            },
            {
                id: '9.5', title: 'Implement DMARC',
                definition: 'To lower the chance of spoofed or modified emails from valid domains, implement DMARC policy and verification, starting with implementing the Sender Policy Framework (SPF) and the DomainKeys Identified Mail (DKIM) standards.',
                purpose: 'Prevent email spoofing.',
                why: 'Spoofed emails can lead to phishing.',
                ...ig(null,
                    { scope: 'Basic DMARC implementation.', approach: 'Implement SPF and DKIM.', example: 'A mid-sized company implements SPF and DKIM.', resources: 'Moderate — DNS configuration.' },
                    { scope: 'Full DMARC deployment.', approach: 'Implement DMARC policy.', example: 'An enterprise implements DMARC.', resources: 'Significant — email configuration.' }
                ),
            },
            {
                id: '9.6', title: 'Block Unnecessary File Types',
                definition: 'Block unnecessary file types attempting to enter the enterprise’s email gateway.',
                purpose: 'Prevent malicious attachments.',
                why: 'Unnecessary file types can contain malware.',
                ...ig(null,
                    { scope: 'File type blocking.', approach: 'Configure email gateway to block file types.', example: 'A mid-sized company blocks executable files.', resources: 'Moderate — gateway configuration.' },
                    { scope: 'Advanced file blocking.', approach: 'Use DLP for file blocking.', example: 'An enterprise uses Forcepoint for file blocking.', resources: 'Significant — DLP.' }
                ),
            },
            {
                id: '9.7', title: 'Deploy and Maintain Email Server Anti-Malware Protections',
                definition: 'Deploy and maintain email server anti-malware protections, such as attachment scanning and/or sandboxing.',
                purpose: 'Detect and block malicious emails.',
                why: 'Email is a common malware vector.',
                ...ig(null, null,
                    { scope: 'Email anti-malware.', approach: 'Deploy anti-malware on email servers.', example: 'An enterprise uses Trend Micro for email protection.', resources: 'Significant — anti-malware tools.' }
                ),
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 10 — Malware Defenses
    // ════════════════════════════════════════════════════════════════════════════
    {
        id: 10,
        title: 'Malware Defenses',
        definition: 'Prevent or control the installation, spread, and execution of malicious applications, code, or scripts on enterprise assets.',
        purpose: 'To prevent and control the installation, spread, and execution of malicious software on enterprise assets by deploying anti-malware tools, updating signatures, disabling auto-execution on removable media, enabling anti-exploitation features, centrally managing anti-malware software, and using behavior-based detection.',
        safeguards: 
        [
            {
                id: '10.1', title: 'Deploy and Maintain Anti-Malware Software',
                definition: 'Deploy and maintain anti-malware software on all enterprise assets.',
                purpose: 'Detect and prevent malware infections.',
                why: 'Malware can compromise systems and data.',
                ...ig(
                    { scope: 'Basic anti-malware deployment.', approach: 'Install anti-malware on all assets.', example: 'A small business installs free anti-malware.', resources: 'Minimal — free tools.' },
                    { scope: 'Managed anti-malware.', approach: 'Centrally manage anti-malware.', example: 'A mid-sized company uses McAfee ePO.', resources: 'Moderate — management tools.' },
                    { scope: 'Enterprise anti-malware.', approach: 'Integrate anti-malware with EDR.', example: 'An enterprise uses CrowdStrike.', resources: 'Significant — EDR.' }
                ),
            },
            {
                id: '10.2', title: 'Configure Automatic Anti-Malware Signature Updates',
                definition: 'Configure automatic updates for anti-malware signature files on all enterprise assets.',
                purpose: 'Ensure anti-malware is up-to-date.',
                why: 'Outdated signatures miss new malware.',
                ...ig(
                    { scope: 'Basic signature updates.', approach: 'Enable automatic updates.', example: 'A small business enables auto-updates.', resources: 'Minimal — built-in features.' },
                    { scope: 'Managed signature updates.', approach: 'Centrally manage updates.', example: 'A mid-sized company manages updates centrally.', resources: 'Moderate — management tools.' },
                    { scope: 'Enterprise signature updates.', approach: 'Integrate with threat intelligence.', example: 'An enterprise uses threat intelligence for updates.', resources: 'Significant — intelligence feeds.' }
                ),
            },
            {
                id: '10.3', title: 'Disable Autorun and Autoplay for Removable Media',
                definition: 'Disable autorun and autoplay auto-execute functionality for removable media.',
                purpose: 'Prevent malware from removable media.',
                why: 'Autorun can execute malware automatically.',
                ...ig(
                    { scope: 'Basic autorun disable.', approach: 'Disable autorun in OS.', example: 'A small business disables autorun in Windows.', resources: 'Minimal — OS configuration.' },
                    { scope: 'Managed autorun disable.', approach: 'Use GPO to disable autorun.', example: 'A mid-sized company uses GPO.', resources: 'Moderate — policy management.' },
                    { scope: 'Enterprise autorun disable.', approach: 'Integrate with endpoint protection.', example: 'An enterprise uses EDR to block autorun.', resources: 'Significant — EDR.' }
                ),
            },
            {
                id: '10.4', title: 'Configure Automatic Anti-Malware Scanning of Removable Media',
                definition: 'Configure anti-malware software to automatically scan removable media.',
                purpose: 'Scan removable media for malware.',
                why: 'Removable media can introduce malware.',
                ...ig(null,
                    { scope: 'Automatic scanning of removable media.', approach: 'Configure anti-malware to scan removable media.', example: 'A mid-sized company configures scanning.', resources: 'Moderate — anti-malware configuration.' },
                    { scope: 'Advanced scanning.', approach: 'Integrate with DLP.', example: 'An enterprise integrates with DLP.', resources: 'Significant — DLP.' }
                ),
            },
            {
                id: '10.5', title: 'Enable Anti-Exploitation Features',
                definition: 'Enable anti-exploitation features on enterprise assets and software, where possible, such as Microsoft® Data Execution Prevention (DEP), Windows® Defender Exploit Guard (WDEG), or Apple® System Integrity Protection (SIP) and Gatekeeper™.',
                purpose: 'Prevent exploitations of vulnerabilities.',
                why: 'Exploitations can lead to code execution.',
                ...ig(null,
                    { scope: 'Enable anti-exploitation.', approach: 'Enable DEP and similar features.', example: 'A mid-sized company enables DEP.', resources: 'Moderate — OS configuration.' },
                    { scope: 'Advanced anti-exploitation.', approach: 'Use WDEG or SIP.', example: 'An enterprise uses WDEG.', resources: 'Significant — advanced features.' }
                ),
            },
            {
                id: '10.6', title: 'Centrally Manage Anti-Malware Software',
                definition: 'Centrally manage anti-malware software.',
                purpose: 'Ensure consistent anti-malware management.',
                why: 'Decentralized management leads to inconsistencies.',
                ...ig(null,
                    { scope: 'Central anti-malware management.', approach: 'Use central console.', example: 'A mid-sized company uses central console.', resources: 'Moderate — management tools.' },
                    { scope: 'Enterprise anti-malware management.', approach: 'Integrate with SIEM.', example: 'An enterprise integrates with SIEM.', resources: 'Significant — SIEM.' }
                ),
            },
            {
                id: '10.7', title: 'Use Behavior-Based Anti-Malware Software',
                definition: 'Use behavior-based anti-malware software.',
                purpose: 'Detect malware based on behavior.',
                why: 'Signature-based misses unknown malware.',
                ...ig(null,
                    { scope: 'Behavior-based anti-malware.', approach: 'Deploy behavior-based tools.', example: 'A mid-sized company deploys EDR.', resources: 'Moderate — EDR tools.' },
                    { scope: 'Advanced behavior-based.', approach: 'Use ML-based detection.', example: 'An enterprise uses ML EDR.', resources: 'Significant — ML tools.' }
                ),
            },
        ],
    },
    // ════════════════════════════════════════════════════════════════════════════
    // Control 11 — Data Recovery
    // ════════════════════════════════════════════════════════════════════════════
    {
        id: 11,
        title: 'Data Recovery',
        definition: 'Establish and maintain data recovery practices sufficient to restore in-scope enterprise assets to a pre-incident and trusted state.',
        purpose: 'To ensure the availability of critical data and systems by enabling restoration to a known trusted state following incidents such as ransomware or configuration changes, thereby minimizing business disruptions and supporting operational continuity.',
        safeguards: 
        [
            {
                id: '11.1', title: 'Establish and Maintain a Data Recovery Process',
                definition: 'Establish and maintain a documented data recovery process. In the process, address the scope of data recovery activities, recovery prioritization, and the security of backup data. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.',
                purpose: 'Provide a structured framework for data recovery activities.',
                why: 'Without a data recovery process, restoration may be inefficient or incomplete.',
                ...ig(
                    { scope: 'Create a basic data recovery process.', approach: 'Document a simple recovery process covering scope and prioritization.', example: 'A small business documents a data recovery process and reviews annually.', resources: 'Minimal — policy documentation only.' },
                    { scope: 'Formalized data recovery with automation.', approach: 'Develop a comprehensive recovery policy with automated processes.', example: 'A mid-sized company creates a recovery policy and uses tools for automation.', resources: 'Moderate — requires policy and tools.' },
                    { scope: 'Enterprise-wide recovery program.', approach: 'Implement a full recovery framework with automated backups and testing.', example: 'An enterprise uses Veeam for automated recovery.', resources: 'Significant — requires backup tools.' }
                ),
            },
            {
                id: '11.2', title: 'Perform Automated Backups',
                definition: 'Perform automated backups of in-scope enterprise assets. Run backups weekly, or more frequently, based on the sensitivity of the data.',
                purpose: 'Ensure regular backups are performed automatically.',
                why: 'Manual backups are error-prone and inconsistent.',
                ...ig(
                    { scope: 'Basic automated backups.', approach: 'Set up automated backups weekly.', example: 'A small business sets up weekly automated backups.', resources: 'Minimal — built-in tools.' },
                    { scope: 'Managed automated backups.', approach: 'Use tools for automated backups.', example: 'A mid-sized company uses BackupExec.', resources: 'Moderate — backup tools.' },
                    { scope: 'Enterprise automated backups.', approach: 'Integrate backups with cloud.', example: 'An enterprise uses Azure Backup.', resources: 'Significant — cloud backup.' }
                ),
            },
            {
                id: '11.3', title: 'Protect Recovery Data',
                definition: 'Protect recovery data with equivalent controls to the original data. Reference encryption or data separation, based on requirements.',
                purpose: 'Secure backup data from unauthorized access.',
                why: 'Unprotected backups can be targeted by attackers.',
                ...ig(
                    { scope: 'Basic backup protection.', approach: 'Encrypt backups.', example: 'A small business encrypts backups.', resources: 'Minimal — encryption.' },
                    { scope: 'Managed backup protection.', approach: 'Use data separation.', example: 'A mid-sized company uses separate storage.', resources: 'Moderate — storage.' },
                    { scope: 'Enterprise backup protection.', approach: 'Use advanced encryption.', example: 'An enterprise uses KMS for backups.', resources: 'Significant — key management.' }
                ),
            },
            {
                id: '11.4', title: 'Establish and Maintain an Isolated Instance of Recovery Data',
                definition: 'Establish and maintain an isolated instance of recovery data. Example implementations include, version controlling backup destinations through offline, cloud, or off-site systems or services.',
                purpose: 'Ensure backups are isolated from attacks.',
                why: 'Isolated backups prevent ransomware from encrypting them.',
                ...ig(
                    { scope: 'Basic isolated backups.', approach: 'Use offline backups.', example: 'A small business uses offline backups.', resources: 'Minimal — offline storage.' },
                    { scope: 'Managed isolated backups.', approach: 'Use cloud backups.', example: 'A mid-sized company uses cloud backups.', resources: 'Moderate — cloud services.' },
                    { scope: 'Enterprise isolated backups.', approach: 'Use version control.', example: 'An enterprise uses versioned backups.', resources: 'Significant — version control.' }
                ),
            },
            {
                id: '11.5', title: 'Test Data Recovery',
                definition: 'Test backup recovery quarterly, or more frequently, for a sampling of in-scope enterprise assets.',
                purpose: 'Verify backups are recoverable.',
                why: 'Untested backups may fail during recovery.',
                ...ig(null,
                { scope: 'Quarterly backup testing.', approach: 'Test backups quarterly.', example: 'A mid-sized company tests backups quarterly.', resources: 'Moderate — testing environment.' },
                { scope: 'Frequent backup testing.', approach: 'Automate backup testing.', example: 'An enterprise automates backup testing.', resources: 'Significant — automation.' }
                ),
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 12 — Network Infrastructure Management
    // ════════════════════════════════════════════════════════════════════════════
    {
        id: 12,
        title: 'Network Infrastructure Management',
        definition: 'Establish, implement, and actively manage (track, report, correct) network devices, in order to prevent attackers from exploiting vulnerable network services and access points.',
        purpose: 'Prevent attackers from exploiting vulnerable services and misconfigurations on network devices by maintaining secure configurations, proper segmentation, secure management practices, and visibility into network infrastructure.',
        safeguards: [
          {
            id: '12.1', title: 'Ensure Network Infrastructure is Up-to-Date',
            definition: 'Ensure network infrastructure is kept up-to-date. Example implementations include running the latest stable release of software and/or using currently supported network as a service (NaaS) offerings. Review software versions monthly, or more frequently, to verify software support.',
            purpose: 'Reduce exposure to known vulnerabilities in network device firmware and operating systems.',
            why: 'Outdated network device software is frequently exploited — attackers target known CVEs in routers, switches, and firewalls.',
            ig1: { scope: 'Basic firmware and software updates.', approach: 'Manually check and apply vendor updates to critical network devices monthly.', example: 'A small business downloads and installs the latest firmware on its firewall and core switch every month.', resources: 'Minimal — vendor download portal access.' },
            ig2: { scope: 'Managed and tracked network updates.', approach: 'Use network configuration management tools to track versions and automate patch deployment where supported.', example: 'A mid-sized company uses SolarWinds NCM or Cisco Prime to track firmware versions and schedule updates.', resources: 'Moderate — requires network management platform.' },
            ig3: { scope: 'Automated, zero-touch network updates with validation.', approach: 'Implement automated patch orchestration with pre- and post-update validation, rollback capability, and integration with change management.', example: 'An enterprise uses Ansible Tower or Cisco DNA Center to automate firmware updates across hundreds of devices with staged rollouts and validation checks.', resources: 'Significant — requires automation platform and network team.' },
          },
          {
            id: '12.2', title: 'Establish and Maintain a Secure Network Architecture',
            definition: 'Establish and maintain a secure network architecture that includes network segmentation based on asset sensitivity, least-privilege access, and defense-in-depth principles. Review architecture annually or after major changes.',
            purpose: 'Limit lateral movement and contain breaches by isolating systems of different trust levels.',
            why: 'Flat networks allow attackers who compromise one system to move freely across the environment.',
            ig1: { scope: 'Basic network segmentation.', approach: 'Implement simple VLANs to separate guest, employee, and server traffic.', example: 'A small business uses VLANs on its switch to keep guest Wi-Fi separate from internal networks.', resources: 'Minimal — basic managed switch.' },
            ig2: { scope: 'Formalized segmentation with access controls.', approach: 'Implement zoned architecture (e.g., DMZ, internal, critical systems) with firewall rules enforcing least privilege between zones.', example: 'A mid-sized company uses next-gen firewalls to enforce strict rules between finance servers, workstations, and IoT VLANs.', resources: 'Moderate — requires firewall and network design.' },
            ig3: { scope: 'Zero-trust / micro-segmentation architecture.', approach: 'Implement software-defined micro-segmentation, identity-based policies, and continuous monitoring of east-west traffic.', example: 'An enterprise uses Illumio or Cisco Tetration to enforce workload-level segmentation and monitor all internal flows.', resources: 'Significant — requires zero-trust platform and advanced networking.' },
          },
          {
            id: '12.3', title: 'Securely Manage Network Infrastructure',
            definition: 'Securely manage network infrastructure. Example implementations include using version-controlled infrastructure-as-code, secure protocols (SSHv2, HTTPS, SNMPv3), jump hosts / bastion hosts, and credential vaulting.',
            purpose: 'Prevent credential theft, man-in-the-middle attacks, and unauthorized configuration changes during network administration.',
            why: 'Insecure management interfaces (Telnet, HTTP, weak SNMP) are frequently exploited to gain control of network devices.',
            ig1: { scope: 'Use secure management protocols.', approach: 'Disable Telnet/HTTP, enforce SSH and HTTPS, change default credentials.', example: 'A small business disables Telnet on all routers and requires SSH with key authentication.', resources: 'Minimal — device configuration.' },
            ig2: { scope: 'Centralized secure management.', approach: 'Implement jump servers, TACACS+/RADIUS for AAA, and SNMPv3.', example: 'A mid-sized company routes all admin access through bastion hosts and uses RADIUS for authentication.', resources: 'Moderate — requires AAA server and bastion.' },
            ig3: { scope: 'Privileged network access management.', approach: 'Deploy network PAM with session recording, just-in-time access, credential rotation, and IaC for configuration.', example: 'An enterprise uses BeyondTrust or CyberArk NetDev for privileged network sessions with full recording and automatic credential rotation.', resources: 'Significant — requires network PAM solution.' },
          },
          {
            id: '12.4', title: 'Establish and Maintain Network Diagram(s)',
            definition: 'Establish and maintain current network diagram(s) showing critical devices, data flows, security boundaries, and trust zones. Review and update at least annually or after significant changes.',
            purpose: 'Maintain situational awareness of network topology to support secure design, incident response, and change management.',
            why: 'Outdated or missing network diagrams make it difficult to identify attack paths, misconfigurations, or unauthorized connections.',
            ...ig(null,
              { scope: 'Maintain basic network documentation.', approach: 'Create and update diagrams using Visio, draw.io, or similar tools after major changes.', example: 'A mid-sized company maintains Visio diagrams of core switches, firewalls, and DMZ.', resources: 'Moderate — diagramming software.' },
              { scope: 'Automated and living network documentation.', approach: 'Use network mapping tools integrated with CMDB that auto-discover and update topology.', example: 'An enterprise uses SolarWinds NPM or Device42 to generate live network maps synced with asset inventory.', resources: 'Significant — requires network discovery platform.' }),
          },
          {
            id: '12.5', title: 'Centralize Network Authentication, Authorization, and Accounting (AAA)',
            definition: 'Centralize network AAA through standards-based protocols (TACACS+, RADIUS) integrated with enterprise directory services.',
            purpose: 'Enforce consistent authentication, authorization, and logging for all network device access.',
            why: 'Local accounts on network devices lead to untracked access, password reuse, and difficulty revoking privileges.',
            ...ig(null,
              { scope: 'Centralized AAA for network devices.', approach: 'Configure devices to use RADIUS or TACACS+ against enterprise directory.', example: 'A mid-sized company configures Cisco devices to use ISE for AAA.', resources: 'Moderate — requires AAA server (e.g., Cisco ISE, FreeRADIUS).' },
              { scope: 'Enterprise network AAA with advanced features.', approach: 'Implement policy-based AAA with role-based access, session timeouts, and integration with PAM.', example: 'An enterprise uses Aruba ClearPass or ISE with dynamic authorization and full command accounting.', resources: 'Significant — requires enterprise NAC/AAA platform.' }),
          },
          {
            id: '12.6', title: 'Use Secure Network Management and Communication Protocols',
            definition: 'Use secure network management and communication protocols (e.g., SSHv2, HTTPS, SNMPv3 with authentication and encryption, IPsec for site-to-site, WPA3 for wireless). Disable insecure protocols.',
            purpose: 'Protect management traffic and wireless communications from interception and tampering.',
            why: 'Clear-text protocols expose credentials and configuration data to eavesdropping and replay attacks.',
            ...ig(null,
              { scope: 'Enforce secure protocols.', approach: 'Disable Telnet, HTTP, SNMPv1/v2; require SSHv2, HTTPS, WPA3.', example: 'A mid-sized company disables insecure protocols via global configuration templates.', resources: 'Moderate — configuration templates.' },
              { scope: 'Enterprise secure protocol enforcement with monitoring.', approach: 'Enforce protocols via policy, monitor for insecure usage, and use certificate-based authentication where possible.', example: 'An enterprise uses certificate-based SSH and monitors for protocol violations via NetFlow and SIEM.', resources: 'Significant — requires PKI and monitoring.' }),
          },
          {
            id: '12.7', title: 'Ensure Remote Network Access is Through Enterprise-Controlled VPN',
            definition: 'Require remote network access to occur through enterprise-managed VPN solutions with strong authentication (MFA) and device posture checking where possible.',
            purpose: 'Prevent unauthorized and unmonitored remote access to internal network resources.',
            why: 'Direct RDP, SSH, or unmonitored remote access is a frequent initial access vector.',
            ...ig(null,
              { scope: 'Mandate VPN for remote access.', approach: 'Require all remote connections via VPN with MFA.', example: 'A mid-sized company enforces AnyConnect VPN with Duo MFA for all remote workers.', resources: 'Moderate — VPN gateway + MFA.' },
              { scope: 'Zero-trust remote access.', approach: 'Replace traditional VPN with ZTNA providing per-app access, continuous verification, and device compliance checks.', example: 'An enterprise uses Zscaler Private Access or Netskope with continuous device posture and identity verification.', resources: 'Significant — requires ZTNA platform.' }),
          },
          {
            id: '12.8', title: 'Establish and Maintain Dedicated Administrative Workstations',
            definition: 'Establish and maintain dedicated, hardened administrative workstations (PAWs / jump workstations) for network and system administration tasks. Do not use these workstations for general-purpose activities (email, browsing).',
            purpose: 'Isolate administrative credentials and tools from daily-use risks such as phishing and malware.',
            why: 'Using everyday workstations for admin tasks exposes privileged credentials to compromise.',
            ...ig(null, null,
              { scope: 'Privileged Access Workstations (PAWs).', approach: 'Deploy hardened, locked-down PAWs or virtual desktops for all network administration.', example: 'An enterprise deploys dedicated physical PAWs running only admin tools, with no internet browsing allowed.', resources: 'Significant — requires dedicated hardware or VDI + hardening.' }),
          },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 13 — Network Monitoring and Defense
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 13,
      title: 'Network Monitoring and Defense',
      definition: 'Operate processes and tooling to establish and maintain comprehensive network defenses, including monitoring, detection, and response capabilities.',
      purpose: 'Detect malicious network activity, prevent lateral movement, command-and-control, and data exfiltration through network-layer visibility and controls.',
      safeguards: [
        {
          id: '13.1', title: 'Centralize Network Logging',
          definition: 'Collect network flow and device logs (NetFlow, sFlow, Syslog, SNMP traps) and centralize them for analysis.',
          purpose: 'Provide visibility into network traffic patterns and device status.',
          why: 'Without centralized network logging, malicious activity can go undetected.',
          ...ig(null,
            { scope: 'Basic network logging centralization.', approach: 'Send Syslog and NetFlow to a central server.', example: 'A mid-sized company uses rsyslog to collect device logs.', resources: 'Moderate — Syslog server.' },
            { scope: 'Enterprise network visibility.', approach: 'Deploy full-packet capture, NetFlow, and device telemetry to SIEM.', example: 'An enterprise uses Cisco Secure Network Analytics or Darktrace for network telemetry.', resources: 'Significant — network detection & response (NDR) platform.' }),
        },
        {
          id: '13.2', title: 'Deploy a Network Intrusion Detection/Prevention System',
          definition: 'Deploy Network Intrusion Detection/Prevention System (NIDS/NIPS) to monitor network traffic for malicious activity.',
          purpose: 'Detect and/or block known attack signatures and anomalous behavior.',
          why: 'Network-based detection catches attacks that bypass host-based controls.',
          ...ig(null,
            { scope: 'Basic NIDS deployment.', approach: 'Deploy open-source IDS (Snort, Suricata) on key network segments.', example: 'A mid-sized company runs Suricata on SPAN ports at core switches.', resources: 'Moderate — SPAN ports + IDS.' },
            { scope: 'Enterprise NDR / IPS.', approach: 'Deploy commercial NDR or next-gen IPS with threat intelligence integration.', example: 'An enterprise uses Palo Alto Threat Prevention or ExtraHop Reveal(x).', resources: 'Significant — NDR/IPS platform.' }),
        },
        {
          id: '13.3', title: 'Deploy Network Segmentation Enforcement',
          definition: 'Enforce network segmentation using firewalls, ACLs, or software-defined controls between zones of different trust levels.',
          purpose: 'Prevent unauthorized communication between network segments.',
          why: 'Weak segmentation allows attackers to pivot after initial compromise.',
          ...ig(null,
            { scope: 'Firewall-based segmentation.', approach: 'Use internal firewalls or ACLs to enforce zone boundaries.', example: 'A mid-sized company uses internal firewall rules between departments.', resources: 'Moderate — firewall rules.' },
            { scope: 'Micro-segmentation enforcement.', approach: 'Implement host-based or workload micro-segmentation.', example: 'An enterprise uses VMware NSX or Illumio to enforce workload-level policies.', resources: 'Significant — micro-segmentation platform.' }),
        },
        {
          id: '13.4', title: 'Decrypt Network Traffic at Proxy / Inspection Points',
          definition: 'Decrypt and inspect HTTPS / encrypted traffic at enterprise-controlled proxies or firewalls where technically feasible and compliant with privacy requirements.',
          purpose: 'Prevent encrypted malicious traffic from bypassing security controls.',
          why: 'Attackers increasingly use encryption to hide C2 and exfiltration.',
          ...ig(null, null,
            { scope: 'Enterprise TLS inspection.', approach: 'Deploy TLS interception proxy with enterprise CA.', example: 'An enterprise uses Zscaler Internet Access or Palo Alto with SSL decryption enabled.', resources: 'Significant — proxy/firewall + certificate management.' }),
        },
        {
          id: '13.5', title: 'Collect Network Packets for Analysis',
          definition: 'Collect full-packet capture (PCAP) on critical network segments for forensic and incident response purposes.',
          purpose: 'Enable detailed post-incident analysis of malicious traffic.',
          why: 'Metadata alone is often insufficient for full incident reconstruction.',
          ...ig(null, null,
            { scope: 'Critical segment packet capture.', approach: 'Deploy packet capture appliances or software on key links.', example: 'An enterprise uses Riverbed or Keysight appliances for PCAP on Internet egress and data center core.', resources: 'Significant — packet capture infrastructure.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 14 — Security Awareness and Skills Training
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 14,
      title: 'Security Awareness and Skills Training',
      definition: 'Establish and maintain a security awareness program to influence workforce behavior and reduce human-related security incidents.',
      purpose: 'Reduce risk from human error, social engineering, and insider threats through ongoing education and skills development.',
      safeguards: [
        {
          id: '14.1', title: 'Establish and Maintain a Security Awareness Program',
          definition: 'Establish and maintain a security awareness program that is updated regularly and addresses current threats and organizational policies.',
          purpose: 'Create a culture of security awareness across the organization.',
          why: 'Humans remain one of the most common attack vectors.',
          ig1: { scope: 'Basic security awareness training.', approach: 'Deliver annual awareness training covering phishing, passwords, and policy.', example: 'A small business uses free phishing awareness videos and annual policy acknowledgment.', resources: 'Minimal — free training materials.' },
          ig2: { scope: 'Formalized ongoing awareness program.', approach: 'Implement regular (monthly/quarterly) training, phishing simulations, and role-based content.', example: 'A mid-sized company runs monthly security tips and quarterly simulated phishing campaigns.', resources: 'Moderate — awareness platform (KnowBe4, Proofpoint).' },
          ig3: { scope: 'Mature, measured security culture program.', approach: 'Deploy comprehensive program with behavior metrics, gamification, targeted training, and executive engagement.', example: 'An enterprise uses advanced platform with real-time metrics and integrates findings into performance reviews.', resources: 'Significant — enterprise awareness platform + dedicated staff.' },
        },
        {
          id: '14.2', title: 'Conduct Security Awareness Training',
          definition: 'Conduct security awareness training for all users at least annually, and provide targeted training for high-risk roles.',
          purpose: 'Ensure all personnel understand security responsibilities.',
          why: 'Untrained users are more likely to fall for attacks.',
          ...ig(
            { scope: 'Annual basic training.', approach: 'Require annual computer-based training for all staff.', example: 'A small business requires everyone to complete annual training module.', resources: 'Minimal — training content.' },
            { scope: 'Ongoing and role-based training.', approach: 'Deliver monthly micro-training and specialized content for developers, admins, finance staff.', example: 'A mid-sized company uses short monthly videos and role-specific modules.', resources: 'Moderate — awareness platform.' },
            { scope: 'Continuous, adaptive training.', approach: 'Use behavior-based triggers to deliver just-in-time training after risky actions.', example: 'An enterprise triggers extra phishing training after failed simulations.', resources: 'Significant — advanced platform.' }),
        },
        {
          id: '14.3', title: 'Conduct Phishing Resistance Training',
          definition: 'Conduct phishing resistance training using realistic phishing simulations to train personnel to recognize and report phishing attempts.',
          purpose: 'Reduce successful phishing attacks through experiential learning.',
          why: 'Phishing remains the #1 initial access vector.',
          ...ig(null,
            { scope: 'Basic phishing simulations.', approach: 'Run quarterly simulated phishing campaigns.', example: 'A mid-sized company sends simulated phishing emails quarterly.', resources: 'Moderate — simulation tool.' },
            { scope: 'Advanced phishing program.', approach: 'Run frequent, adaptive campaigns with increasing difficulty and real-time coaching.', example: 'An enterprise runs monthly adaptive campaigns with immediate feedback and leaderboards.', resources: 'Significant — enterprise-grade platform.' }),
        },
        {
          id: '14.4', title: 'Conduct Social Engineering Resistance Training',
          definition: 'Train personnel to recognize and resist social engineering attacks including pretexting, baiting, quid pro quo, and tailgating.',
          purpose: 'Protect against non-technical manipulation techniques.',
          why: 'Social engineering bypasses technical controls.',
          ...ig(null, null,
            { scope: 'Social engineering awareness.', approach: 'Include social engineering topics in awareness program and simulations.', example: 'An enterprise includes vishing and physical security scenarios in training.', resources: 'Significant — comprehensive program.' }),
        },
        {
          id: '14.5', title: 'Establish and Maintain Physical Security Awareness',
          definition: 'Train personnel on physical security policies including badge usage, tailgating prevention, clean desk, and visitor escort requirements.',
          purpose: 'Reduce risk of physical security compromise.',
          why: 'Physical access can bypass logical controls.',
          ...ig(null, null,
            { scope: 'Physical security training.', approach: 'Include physical security in onboarding and annual training.', example: 'An enterprise requires annual physical security acknowledgment and posters in facilities.', resources: 'Significant — facility-wide program.' }),
        },
        {
          id: '14.6', title: 'Establish and Maintain Incident Reporting Culture',
          definition: 'Train personnel on how and when to report security incidents and suspicious activity without fear of punishment.',
          purpose: 'Enable rapid detection through user reporting.',
          why: 'Many incidents are first noticed by regular users.',
          ...ig(null,
            { scope: 'Incident reporting training.', approach: 'Teach users how to report suspicious activity.', example: 'A mid-sized company includes “see something, say something” in training.', resources: 'Moderate — awareness content.' },
            { scope: 'Strong reporting culture.', approach: 'Reward reporting and publicize successful detections from user reports.', example: 'An enterprise recognizes “security champions” who report incidents.', resources: 'Significant — culture-building program.' }),
        },
        {
          id: '14.7', title: 'Establish and Maintain Executive Security Awareness',
          definition: 'Provide tailored security awareness training for executives and board members focusing on high-impact risks (BEC, impersonation, strategic decisions).',
          purpose: 'Protect high-value targets from targeted attacks.',
          why: 'Executive compromise can cause catastrophic damage.',
          ...ig(null, null,
            { scope: 'Executive security training.', approach: 'Conduct executive tabletop exercises and targeted phishing simulations.', example: 'An enterprise runs annual executive security briefings and BEC simulations.', resources: 'Significant — executive-level program.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 15 — Service Provider Management
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 15,
      title: 'Service Provider Management',
      definition: 'Develop practices to evaluate service providers handling sensitive enterprise data or providing critical services, and ensure appropriate security controls are in place.',
      purpose: 'Reduce supply-chain and third-party risk by ensuring vendors meet security requirements commensurate with the data and services they handle.',
      safeguards: [
        {
          id: '15.1', title: 'Establish and Maintain a Vendor Management Process',
          definition: 'Establish and maintain a documented vendor risk management process covering selection, assessment, contracting, monitoring, and offboarding.',
          purpose: 'Systematically manage third-party security risk throughout the vendor lifecycle.',
          why: 'Compromised vendors are a leading cause of major breaches.',
          ig1: { scope: 'Basic vendor security requirements.', approach: 'Require vendors to complete basic security questionnaire and sign data protection addendum.', example: 'A small business requires key SaaS vendors to complete a short security checklist.', resources: 'Minimal — questionnaire template.' },
          ig2: { scope: 'Formal vendor risk management program.', approach: 'Implement tiered risk assessment based on data sensitivity and criticality.', example: 'A mid-sized company classifies vendors into tiers and requires SOC 2 reports for Tier 1 vendors.', resources: 'Moderate — risk management process.' },
          ig3: { scope: 'Mature third-party risk management program.', approach: 'Deploy automated TPRM platform with continuous monitoring, contract clause tracking, and remediation workflows.', example: 'An enterprise uses OneTrust or Bitsight for continuous vendor risk monitoring.', resources: 'Significant — TPRM platform.' },
        },
        {
          id: '15.2', title: 'Assess Third-Party Risk',
          definition: 'Assess third-party risk using a standardized methodology based on the sensitivity of data accessed and criticality of the service provided.',
          purpose: 'Understand and quantify risk introduced by each vendor.',
          why: 'Not all vendors present equal risk — assessment should be risk-based.',
          ...ig(null,
            { scope: 'Risk-based vendor assessment.', approach: 'Use tiered questionnaire and request security documentation for high-risk vendors.', example: 'A mid-sized company requires SOC 2 Type 2 or ISO 27001 for cloud providers.', resources: 'Moderate — assessment templates.' },
            { scope: 'Continuous third-party risk monitoring.', approach: 'Use security rating services and continuous control monitoring.', example: 'An enterprise uses SecurityScorecard and Bitsight for ongoing vendor risk scores.', resources: 'Significant — security ratings platform.' }),
        },
        {
          id: '15.3', title: 'Require Security Controls in Vendor Contracts',
          definition: 'Include security and privacy requirements in vendor contracts commensurate with the sensitivity of the data and criticality of the service.',
          purpose: 'Create enforceable contractual obligations for vendor security practices.',
          why: 'Without contractual requirements, vendors may not maintain adequate security.',
          ...ig(null,
            { scope: 'Basic security clauses in contracts.', approach: 'Include standard security addendum in vendor agreements.', example: 'A mid-sized company requires vendors to protect data and report breaches within 48 hours.', resources: 'Moderate — legal review.' },
            { scope: 'Comprehensive security contracting.', approach: 'Include detailed security schedules, right-to-audit, and flow-down requirements.', example: 'An enterprise includes NIST 800-53 mappings and annual SOC 2 requirement in critical vendor contracts.', resources: 'Significant — legal and procurement team.' }),
        },
        {
          id: '15.4', title: 'Monitor Service Provider Compliance',
          definition: 'Monitor service providers for ongoing compliance with security requirements through periodic assessments, attestations, and monitoring services.',
          purpose: 'Ensure vendors continue to meet security commitments over time.',
          why: 'Vendor security posture can degrade after contract signing.',
          ...ig(null, null,
            { scope: 'Ongoing vendor compliance monitoring.', approach: 'Request annual security attestations and review security ratings.', example: 'An enterprise requires annual SOC 2 reports and monitors Bitsight scores monthly.', resources: 'Significant — monitoring platform + contract management.' }),
        },
        {
          id: '15.5', title: 'Establish Incident Response Relationship with Service Providers',
          definition: 'Establish clear incident notification, coordination, and response expectations with critical service providers.',
          purpose: 'Enable rapid joint response to incidents involving vendors.',
          why: 'Delayed vendor notification can significantly extend breach impact.',
          ...ig(null, null,
            { scope: 'Vendor incident coordination.', approach: 'Include breach notification timelines (e.g., 24–72 hours) and joint response procedures in contracts.', example: 'An enterprise requires critical vendors to notify within 24 hours and participate in joint IR exercises.', resources: 'Significant — legal + IR team coordination.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 16 — Application Software Security
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 16,
      title: 'Application Software Security',
      definition: 'Manage the security life cycle of in-house developed, acquired, and cloud-based application software to prevent, detect, and remediate security weaknesses.',
      purpose: 'Reduce vulnerabilities in applications through secure development, acquisition, and configuration practices.',
      safeguards: [
        {
          id: '16.1', title: 'Establish and Maintain Secure Software Development Process',
          definition: 'Establish and maintain a secure software development lifecycle (SSDLC) process that incorporates security at each phase.',
          purpose: 'Prevent security defects from being introduced during development.',
          why: 'Many serious vulnerabilities originate in application code.',
          ig1: { scope: 'Basic secure development practices.', approach: 'Document basic secure coding requirements and conduct manual code reviews for critical applications.', example: 'A small business requires developers to follow OWASP Top 10 guidelines.', resources: 'Minimal — OWASP resources.' },
          ig2: { scope: 'Formal SSDLC process.', approach: 'Implement secure development policy with mandatory security activities in each phase.', example: 'A mid-sized company requires threat modeling, static analysis, and security testing before production.', resources: 'Moderate — process + tools.' },
          ig3: { scope: 'Mature DevSecOps program.', approach: 'Fully integrate security into CI/CD pipeline with automated scanning, hardening, and runtime protection.', example: 'An enterprise uses SAST/DAST in GitHub Actions, container scanning, and runtime application self-protection (RASP).', resources: 'Significant — DevSecOps platform.' },
        },
        {
          id: '16.2', title: 'Establish Application Security Requirements',
          definition: 'Establish application security requirements that define secure coding, configuration, and testing standards.',
          purpose: 'Provide clear security expectations for developers and acquirers.',
          why: 'Without defined requirements, security is inconsistent.',
          ...ig(null,
            { scope: 'Basic application security requirements.', approach: 'Adopt OWASP ASVS or similar standard as baseline.', example: 'A mid-sized company requires applications to meet ASVS Level 1.', resources: 'Moderate — standards adoption.' },
            { scope: 'Risk-based application security requirements.', approach: 'Define tiered requirements based on application criticality and data sensitivity.', example: 'An enterprise requires ASVS Level 2+ for applications handling PII or financial data.', resources: 'Significant — risk classification.' }),
        },
        {
          id: '16.3', title: 'Verify Application Security Requirements',
          definition: 'Verify that acquired and custom-developed applications meet defined security requirements through review, testing, or attestation.',
          purpose: 'Ensure purchased and developed software meets security standards before deployment.',
          why: 'Many organizations deploy insecure third-party and custom applications.',
          ...ig(null,
            { scope: 'Basic application security verification.', approach: 'Require vendors to complete security questionnaire and conduct basic testing.', example: 'A mid-sized company requires penetration test reports for critical SaaS applications.', resources: 'Moderate — vendor assessment.' },
            { scope: 'Comprehensive application assurance.', approach: 'Conduct or require independent security testing (penetration testing, code review) for critical applications.', example: 'An enterprise requires annual pen-testing for internet-facing applications.', resources: 'Significant — testing budget.' }),
        },
        {
          id: '16.4', title: 'Conduct Software Composition Analysis',
          definition: 'Conduct software composition analysis (SCA) to identify open-source and third-party components with known vulnerabilities.',
          purpose: 'Reduce risk from vulnerable dependencies.',
          why: 'Software supply chain attacks via dependencies are increasingly common.',
          ...ig(null,
            { scope: 'Basic SCA.', approach: 'Use SCA tools to scan for vulnerable open-source components.', example: 'A mid-sized company uses OWASP Dependency-Check in CI pipeline.', resources: 'Moderate — SCA tool.' },
            { scope: 'Enterprise SCA program.', approach: 'Implement policy-as-code, automated blocking of high-risk dependencies, and SBOM generation.', example: 'An enterprise uses Snyk or Black Duck with automated PR blocking and SBOM export.', resources: 'Significant — SCA + policy enforcement.' }),
        },
        {
          id: '16.5', title: 'Conduct Static Application Security Testing',
          definition: 'Conduct static application security testing (SAST) on custom-developed code to identify security defects.',
          purpose: 'Find vulnerabilities early in the development lifecycle.',
          why: 'Finding and fixing issues during development is far less expensive than post-deployment.',
          ...ig(null,
            { scope: 'Basic SAST usage.', approach: 'Run SAST on critical applications before major releases.', example: 'A mid-sized company runs SonarQube scans before production deployment.', resources: 'Moderate — SAST tool.' },
            { scope: 'Integrated SAST in CI/CD.', approach: 'Integrate SAST into developer workflow with quality gates in CI pipeline.', example: 'An enterprise uses Checkmarx or Semgrep in GitLab CI with blocking policies.', resources: 'Significant — DevSecOps integration.' }),
        },
        {
          id: '16.6', title: 'Conduct Dynamic Application Security Testing',
          definition: 'Conduct dynamic application security testing (DAST) on running applications to identify runtime vulnerabilities.',
          purpose: 'Identify vulnerabilities that can only be detected in a running environment.',
          why: 'Some vulnerabilities (e.g., authentication bypass, business logic flaws) are only apparent during runtime.',
          ...ig(null,
            { scope: 'Basic DAST usage.', approach: 'Run periodic DAST scans on production or staging applications.', example: 'A mid-sized company runs OWASP ZAP scans quarterly.', resources: 'Moderate — DAST tool.' },
            { scope: 'Automated DAST in CI/CD.', approach: 'Integrate DAST into CI/CD pipeline for pre-production testing.', example: 'An enterprise uses Burp Suite Enterprise or Invicti in staging environment with automated findings tracking.', resources: 'Significant — DAST platform.' }),
        },
        {
          id: '16.7', title: 'Conduct Penetration Testing',
          definition: 'Conduct penetration testing on in-scope applications at least annually or after significant changes.',
          purpose: 'Identify exploitable vulnerabilities through simulated attacks.',
          why: 'Penetration testing finds issues that automated tools miss.',
          ...ig(null, null,
            { scope: 'Annual penetration testing.', approach: 'Engage third-party testers for critical applications.', example: 'An enterprise conducts annual pen-testing on internet-facing applications.', resources: 'Significant — testing budget.' }),
        },
        {
          id: '16.8', title: 'Conduct Runtime Application Self-Protection (RASP)',
          definition: 'Deploy runtime application self-protection where supported to detect and block application-layer attacks in real time.',
          purpose: 'Provide defense-in-depth for applications.',
          why: 'RASP can block attacks even when vulnerabilities exist.',
          ...ig(null, null,
            { scope: 'RASP deployment.', approach: 'Deploy RASP on critical web applications.', example: 'An enterprise uses Imperva RASP or Contrast Security for key applications.', resources: 'Significant — RASP platform.' }),
        },
        {
          id: '16.9', title: 'Conduct Web Application Firewall (WAF) Deployment',
          definition: 'Deploy and maintain a web application firewall to protect web applications from common attacks.',
          purpose: 'Block common web application attacks at the network layer.',
          why: 'WAF provides immediate protection while code-level fixes are developed.',
          ...ig(null,
            { scope: 'Basic WAF deployment.', approach: 'Deploy WAF with OWASP Core Rule Set.', example: 'A mid-sized company uses ModSecurity with CRS on Apache.', resources: 'Moderate — WAF configuration.' },
            { scope: 'Advanced WAF deployment.', approach: 'Deploy cloud WAF with ML-based anomaly detection and API protection.', example: 'An enterprise uses Cloudflare WAF or F5 Advanced WAF with bot management and API security.', resources: 'Significant — enterprise WAF platform.' }),
        },
        {
          id: '16.10', title: 'Maintain Application Inventory',
          definition: 'Maintain an inventory of all applications (internal, external, cloud) with data classification, owner, and technology stack information.',
          purpose: 'Provide visibility into the application attack surface.',
          why: 'Unknown applications cannot be properly secured.',
          ...ig(null,
            { scope: 'Basic application inventory.', approach: 'Maintain spreadsheet or CMDB entry for all production applications.', example: 'A mid-sized company tracks applications in ServiceNow with owner and data classification.', resources: 'Moderate — inventory process.' },
            { scope: 'Automated application inventory.', approach: 'Use application discovery tools and integrate with asset management.', example: 'An enterprise uses ServiceNow Application Portfolio Management with auto-discovery.', resources: 'Significant — APM platform.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 17 — Incident Response Management
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 17,
      title: 'Incident Response Management',
      definition: 'Establish and maintain an incident response capability to prepare for, detect, analyze, contain, eradicate, and recover from cybersecurity incidents.',
      purpose: 'Minimize the impact of security incidents through structured preparation, rapid response, and continuous improvement.',
      safeguards: [
        {
          id: '17.1', title: 'Designate Personnel to Manage Incident Handling',
          definition: 'Designate key personnel who are responsible for incident handling and have the appropriate authority and skills.',
          purpose: 'Ensure clear accountability for incident response.',
          why: 'Unclear roles lead to delayed or ineffective response.',
          ig1: { scope: 'Basic incident response roles.', approach: 'Document who handles incidents and provide basic training.', example: 'A small business designates IT manager as primary incident responder.', resources: 'Minimal — role assignment.' },
          ig2: { scope: 'Formal incident response team.', approach: 'Establish CSIRT with defined roles, responsibilities, and escalation paths.', example: 'A mid-sized company forms a CSIRT with technical, legal, and communications roles.', resources: 'Moderate — team formation.' },
          ig3: { scope: 'Mature incident response organization.', approach: 'Establish dedicated SOC/CSIRT with 24/7 coverage, specialized roles, and executive sponsorship.', example: 'An enterprise maintains a 24/7 SOC with dedicated IR team and tabletop exercises.', resources: 'Significant — dedicated team.' },
        },
        {
          id: '17.2', title: 'Establish and Maintain Incident Response Process',
          definition: 'Establish and maintain a documented incident response process covering preparation, identification, containment, eradication, recovery, and lessons learned.',
          purpose: 'Provide a repeatable framework for responding to incidents.',
          why: 'Ad-hoc response leads to missed steps and greater damage.',
          ig1: { scope: 'Basic incident response plan.', approach: 'Document high-level response steps and contact list.', example: 'A small business creates a one-page incident response cheat sheet.', resources: 'Minimal — documentation.' },
          ig2: { scope: 'Formal incident response plan.', approach: 'Develop detailed plan with playbooks for common incident types.', example: 'A mid-sized company maintains detailed playbooks for ransomware, data breach, and phishing incidents.', resources: 'Moderate — planning effort.' },
          ig3: { scope: 'Mature, tested incident response program.', approach: 'Maintain living IR plan with automated playbooks, regular testing, and metrics tracking.', example: 'An enterprise uses SOAR platform with automated playbooks and conducts monthly IR simulations.', resources: 'Significant — SOAR platform + testing program.' },
        },
        {
          id: '17.3', title: 'Establish and Maintain Communication Process',
          definition: 'Establish and maintain communication processes for internal and external stakeholders during incidents, including regulatory and law enforcement notification when required.',
          purpose: 'Ensure timely, accurate, and compliant communication during incidents.',
          why: 'Poor communication can cause regulatory violations, reputational damage, and delayed assistance.',
          ...ig(null,
            { scope: 'Basic incident communication.', approach: 'Document who to notify internally and externally.', example: 'A mid-sized company maintains a notification matrix for incidents.', resources: 'Moderate — documentation.' },
            { scope: 'Formal crisis communication plan.', approach: 'Develop detailed communication plan with templates, spokespeople, and regulatory reporting timelines.', example: 'An enterprise maintains crisis communication plan with pre-approved templates and legal review.', resources: 'Significant — communication program.' }),
        },
        {
          id: '17.4', title: 'Conduct Incident Lessons Learned',
          definition: 'Conduct lessons learned / after-action reviews after significant incidents to identify improvements.',
          purpose: 'Improve future response through reflection and process refinement.',
          why: 'Organizations that don’t learn from incidents are doomed to repeat mistakes.',
          ...ig(null,
            { scope: 'Basic lessons learned.', approach: 'Conduct review meeting after major incidents.', example: 'A mid-sized company holds post-incident review within one week.', resources: 'Moderate — meeting time.' },
            { scope: 'Formal post-incident improvement process.', approach: 'Document findings, assign remediation actions, and track to completion.', example: 'An enterprise uses Jira to track IR improvement actions from lessons learned.', resources: 'Significant — tracking system.' }),
        },
        {
          id: '17.5', title: 'Test Incident Response',
          definition: 'Test incident response procedures through tabletop exercises, simulations, and red/blue team exercises at least annually.',
          purpose: 'Validate response capabilities and identify gaps before real incidents.',
          why: 'Untested plans often fail under pressure.',
          ...ig(null,
            { scope: 'Basic IR testing.', approach: 'Conduct annual tabletop exercise.', example: 'A mid-sized company runs annual tabletop with key stakeholders.', resources: 'Moderate — exercise facilitation.' },
            { scope: 'Advanced IR testing.', approach: 'Conduct regular simulations including purple teaming and live-fire exercises.', example: 'An enterprise conducts quarterly tabletop and annual red team exercises with full IR activation.', resources: 'Significant — testing program.' }),
        },
        {
          id: '17.6', title: 'Maintain Incident Response Tools and Resources',
          definition: 'Maintain incident response tools, jump bags, forensics capabilities, and external partner relationships (IR retainers, forensics firms).',
          purpose: 'Ensure responders have necessary capabilities when incidents occur.',
          why: 'Lack of tools and expertise significantly delays response.',
          ...ig(null, null,
            { scope: 'Enterprise IR capability.', approach: 'Maintain IR toolkit, forensics capability, and retainer agreements with IR firms.', example: 'An enterprise maintains Mandiant or CrowdStrike retainer and internal forensics workstation.', resources: 'Significant — budget for tools and retainers.' }),
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════════
    // Control 18 — Penetration Testing
    // ════════════════════════════════════════════════════════════════════════════
    {
      id: 18,
      title: 'Penetration Testing',
      definition: 'Test the overall strength of an organization’s defenses (technology, processes, and people) by simulating the objectives and actions of an attacker.',
      purpose: 'Identify exploitable weaknesses before attackers do through realistic attack simulation.',
      safeguards: [
        {
          id: '18.1', title: 'Establish and Maintain External Penetration Testing Process',
          definition: 'Establish and maintain an external penetration testing process that includes scope definition, rules of engagement, and frequency (at least annually or after significant changes).',
          purpose: 'Identify vulnerabilities accessible from the internet.',
          why: 'Internet-facing assets are under constant attack.',
          ig1: { scope: 'Basic external pen testing.', approach: 'Conduct annual external penetration test of internet-facing assets.', example: 'A small business hires consultant to test public websites and VPN gateway annually.', resources: 'Moderate — testing budget.' },
          ig2: { scope: 'Formal external pen testing program.', approach: 'Define scope, rules of engagement, and test critical external assets annually.', example: 'A mid-sized company conducts annual external pen test including authenticated testing of cloud management interfaces.', resources: 'Significant — testing contract.' },
          ig3: { scope: 'Continuous / advanced external testing.', approach: 'Implement continuous attack surface monitoring combined with periodic red team exercises.', example: 'An enterprise uses continuous external attack surface management (Censys, Rapid7) plus annual red team engagements.', resources: 'Significant — advanced testing program.' },
        },
        {
          id: '18.2', title: 'Perform External Penetration Testing',
          definition: 'Perform and document external penetration testing at least annually or after significant changes to internet-facing assets.',
          purpose: 'Validate external defenses against real-world attacks.',
          why: 'External testing reveals vulnerabilities that automated scanners miss.',
          ...ig(null,
            { scope: 'Annual external testing.', approach: 'Engage qualified testers to attempt compromise of external perimeter.', example: 'A mid-sized company contracts annual external pen test with goal-based approach.', resources: 'Significant — testing budget.' },
            { scope: 'Advanced external testing.', approach: 'Include social engineering, physical access attempts (if in scope), and long-duration stealth testing.', example: 'An enterprise conducts annual red team exercise simulating advanced persistent threat.', resources: 'Significant — red team budget.' }),
        },
        {
          id: '18.3', title: 'Remediate Penetration Test Findings',
          definition: 'Remediate penetration test and red team findings based on risk, with formal verification of fixes.',
          purpose: 'Close identified security gaps discovered during testing.',
          why: 'Unremediated findings provide roadmap for attackers.',
          ...ig(null,
            { scope: 'Formal remediation tracking.', approach: 'Track and verify remediation of critical and high findings.', example: 'A mid-sized company requires re-testing of critical findings within 30 days.', resources: 'Moderate — tracking process.' },
            { scope: 'Risk-based remediation with metrics.', approach: 'Implement risk-based SLAs for remediation and track time-to-remediate metrics.', example: 'An enterprise tracks pen test finding remediation SLAs in security dashboard.', resources: 'Significant — metrics tracking.' }),
        },
        {
          id: '18.4', title: 'Establish and Maintain Internal Penetration Testing Process',
          definition: 'Establish and maintain an internal penetration testing process focusing on internal network, privilege escalation, and lateral movement.',
          purpose: 'Identify weaknesses that could be exploited after initial compromise.',
          why: 'Most major breaches involve internal lateral movement.',
          ...ig(null, null,
            { scope: 'Internal pen testing program.', approach: 'Conduct internal pen testing or red team exercises at least annually.', example: 'An enterprise conducts annual internal red team exercise simulating attacker with foothold.', resources: 'Significant — internal testing budget.' }),
        },
        {
          id: '18.5', title: 'Conduct Internal Penetration Testing',
          definition: 'Perform internal penetration testing to identify exploitable vulnerabilities and attack paths within the internal network.',
          purpose: 'Validate internal network segmentation and privilege controls.',
          why: 'Internal testing reveals paths attackers could use after gaining initial access.',
          ...ig(null, null,
            { scope: 'Internal pen testing execution.', approach: 'Test internal segmentation, credential access, and lateral movement.', example: 'An enterprise uses Cobalt Strike or similar in controlled internal red team exercise.', resources: 'Significant — advanced testing capability.' }),
        },
      ],
    },
];

// Helper to find a control by ID
export function getControlById(id: number): CISControl | undefined {
  return CIS_CONTROLS.find((c) => c.id === id);
}
