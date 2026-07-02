// apps-script/Code.gs
//
// Deploy this as a separate Web App bound to your CPD data Google Sheet.
// Extensions -> Apps Script -> paste this in -> Deploy -> New deployment
// -> type "Web app" -> Execute as "Me" -> Who has access "Anyone"
// Copy the resulting /exec URL into Vercel's LOG_ENDPOINT_URL env var.

const SHEET_ID = "1qWC6Dq2gxIPU_IXERY0S-sR5gFa9jfRBnlBEHNljJNU"; // from the sheet's URL
const LOG_TAB_NAME = "Log";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(LOG_TAB_NAME);

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name || "",
      data.username || "",
      data.userId || "",
      data.text || "",
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: hit this URL in a browser once to confirm the deployment works.
function doGet(e) {
  return ContentService.createTextOutput("KPJU CPD Bot logger is alive.");
}
