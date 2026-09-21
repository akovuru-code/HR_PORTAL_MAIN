# Admin Portal Requirements and Change Notes

Source: **Admin_Portal_Requirements_Notes (1).docx**

These notes capture the changes requested in the document, organized by portal area and role. They describe requested behavior, not verified defects or completed implementation. No priorities, deadlines, technical solutions, or additional requirements have been assigned.

## 1 Employee records in Admin Main

### 1.1 Employee status

- **Requested change:** “In Project should not come directly in the status.”
- **Clarification needed:** The document does not explain whether “In Project” should be removed, prevented as an initial status, or shown only after another action. The intended status transition is not specified.

### 1.2 Mobile number and country codes

- Display the US country code **+1 first** in the mobile number field.
- In the mobile number country code dropdown, remove **UK** and AUS.
- The document specifies ordering for +1; it does not explicitly state that it should be automatically selected.

### 1.3 Passport information

- Add all passport details.
- Include both **old passports** and the **current passport**.
- Include **all pages**.
- Individual passport fields and the upload arrangement are not listed.

### 1.4 SSN format

- Change the SSN format to **3-2-4 digits**, separated by hyphens.
- Stated example: **111-11-1111**.

### 1.5 Visa types

- Remove **L1**, **J1**, and **B1/B2**.
- Add **EAD**, organized “visa-wise/type-wise.”
- The exact EAD categories are not supplied.

### 1.6 Driving License and State ID

- Add **State ID** under Driving License.
- Add these State ID details:
  - State ID Number.
  - State of Issue.
  - Expiry Date.

### 1.7 I-9 Other option

- Add **N/A** under the **Other** section in I-9.

## 2 Onboarding tab

### 2.1 Bank Info tab

- Remove the **Bank Info tab**.
- Bank Details are still explicitly requested within onboarding documentation and certain country checklists below. Removing the tab does not state that Bank Details should be removed everywhere.

### 2.2 Separate document sections

- Add an **Onboarding Documents** box or section.
- Keep it as a **separate box**.
- Add a separate **I-9 Checklist** section.

### 2.3 H1 selection and onboarding documents

- After selecting the **H1 visa type**, display the required checklist/documents.
- The document lists these onboarding documents:
  - I-9 Document.
  - W-4 Document.
  - Bank Details.
  - Void Check, placed **inside Bank Details**.
  - Insurance.
- The document does not provide a complete mapping of each document to every visa or country selection.

### 2.4 F1 Student checklist

- When **F1 Student** is selected, show a specific checklist.
- The contents of that checklist are not enumerated.

### 2.5 India selection

- When **India** is selected, include **Bank Details** and **Insurance**.
- This instruction appears in the F1 Students entry. Whether it applies only to F1 Students or more broadly is not explicit.

### 2.6 Canada checklist

- Add a separate checklist for **Canada**.
- Include **Checklist** and **Bank Details**, as named in the source.
- Individual Canadian checklist items are not specified.

## 3 Work Info tab

### 3.1 Client information

- Remove **Date** from Client Info.
- Add **Client Place**, **Work Email ID**, and **Phone Number**.

### 3.2 Client manager

- Add **Client Manager Designation**.

### 3.3 Client document upload note

- Add a note under **Document Upload** referring to **Client Letter / Appreciation Documents**.
- The source requests a note; it does not explicitly request separate upload controls for each of these document types.

### 3.4 Vendor order

- Add **First Vendor / Prime Vendor / Client Order**.
- Preserve these labels and the stated sequence. The document does not explain whether they are fields, sections, or a workflow order.

### 3.5 Document upload notes

- List these documents to be uploaded:
  - MSA.
  - SOW.
  - Vendor Letter.
  - Others.

### 3.6 Prime Vendor details

- Add Prime Vendor details, including **Work Email ID**, **Phone Number**, and **other documents**.
- The other document types are not enumerated.

### 3.7 Work Info actions

- Remove the **Download** option.
- Remove the **View All** option.
- These instructions appear under HR Admin / Root Admin Changes. The document does not further distinguish which role should lose each action.

## 4 Education Personal Skills and Documents

### 4.1 Separate education sections

- Give **Master’s** and **Bachelor’s** separate boxes or sections.

### 4.2 Education upload label

- Use **Certificate Upload** instead of **Document Upload** in Education.
- No additional upload behavior or file restrictions are specified.

### 4.3 Personal Skills

- Remove **CV Upload**.

### 4.4 Restricted Documents

- Remove **Restricted Documents** from Documents.
- The source does not request deletion of stored document files or explain how existing records should be handled.

## 5 More navigation

### 5.1 Main Admin navigation

- Under **More**, remove **Vendor** and **Projects**.
- Add **Employee** in their place.

### 5.2 Admin and Accounts Admin boxes

- Add a **Bench List** box under More.
- Add an **Open Positions** box under More.
- Add **Announcements** under More.

### 5.3 Accounts Admin options

- Remove **Clients**, **Vendors**, and **Prime Vendor** options. The source spells the last label “Prime Vendore.”
- Add **Employee options** in their place.
- Keep this distinct from the Main Admin navigation change, which names Vendor and Projects.

## 6 HR Admin and Root Admin permissions

### 6.1 Approval for HR Admin edits

- HR Admin should require **Root Admin approval** to make edits.
- The document specifically lists approval for editing:
  - Pattern.
  - Clients.
  - Prime Vendors.
  - Projects.
- **Pattern** is preserved exactly as written; its meaning is not defined.
- The general statement covers edits broadly, followed by four named areas. Whether approval extends beyond those areas is not clarified.
- The approval process and when edited values take effect are not described.

### 6.2 Tabs under Root Admin Recruiters

- Under **Root Admin → Recruiters**, include:
  - HR Tab.
  - Account Tab.
  - Recruiters Tab.

### 6.3 HR Admin Open Positions

- Show **Open Positions** in the **Alerts** section.
- This is separate from the request to add an Open Positions box under More.

### 6.4 Documents access restriction

- Only **Root Admin** should be able to access/view Documents.
- **Other Admin users** should not have access to Documents.

### 6.5 Accounts Admin document access

- A later requirement states that **Accounts Admin Documents should be view-only**.
- **Conflict requiring clarification:** View-only access for Accounts Admin conflicts with the earlier Root Admin-only access rule. The source gives no precedence or exception that resolves this conflict.

## 7 Announcements and News

### 7.1 Announcement recipients

- All admins should receive announcements.
- Employees are excluded: the source states, “Except Employees all admins should get announcements.”

### 7.2 Announcement publishing

- Only **Root Admin** should have permission to **send/publish announcements**.
- Receiving announcements and publishing them are separate permissions in the stated requirements.

### 7.3 News

- Add or retain **News**.
- The source states: **“News → Need to See.”**
- The document does not explain whether this means making News visible, reviewing the existing feature, or another change.

## 8 Invoice Details and Create Invoice

### 8.1 Applicable roles

- Invoice Details applies to both **Accounts Admin** and **Root Admin**.

### 8.2 Billing Frequency

- Add **Billing Frequency** to Invoice Details.
- Allowed values, default selection, and billing calculations are not described.

### 8.3 Week option

- Add a **Week** option to **Create Invoice**.
- The exact field containing this option and its effect on invoice dates or calculations are not specified.

## 9 Items needing clarification before implementation

| Item | Unresolved wording or relationship |
| --- | --- |
| In Project status | What does “should not come directly” mean for status availability or transitions? |
| Passport details | Which individual fields and upload arrangement are intended for old/current passports and all pages? |
| EAD categories | Which visa-wise/type-wise options should be added? |
| Visa and country checklists | What are the full H1, F1 Student, and Canada checklist contents and document mappings? |
| India checklist scope | Is the India condition limited to F1 Students or applicable more broadly? |
| Vendor order | Are First Vendor, Prime Vendor, and Client Order fields, sections, or an ordering requirement? |
| Prime Vendor other documents | Which additional document types are intended? |
| HR Admin approval | Is approval required for all edits or only the four named areas, and what does Pattern refer to? |
| Documents permissions | Does Accounts Admin have a view-only exception to the Root Admin-only restriction? |
| Work Info action removal | Does removing Download and View All apply equally to HR Admin and Root Admin? |
| News | What specifically is requested by “Need to See”? |
| Invoice controls | What Billing Frequency values are required, and where does the Week option belong? |

## 10 Bugs and fixes represented in the source

The document presents requirements and changes rather than a separate bug report. Its corrective requests include the In Project status behavior, country-code ordering and removal, SSN formatting, visa-list changes, document permissions, and removal or replacement of existing UI elements. These are captured above without asserting that the current portal has been tested or that any fix is already complete.

The source does not include error logs, reproduction steps, severity ratings, implementation status, or a Unicode invoice-font requirement. The earlier invoice-font discussion is therefore not part of these document-based notes.
