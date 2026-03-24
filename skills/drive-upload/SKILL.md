# SKILL: drive-upload

## Co dělá
Drag & drop nebo 📎 tlačítko v chatu nahraje soubor přímo do Google Drive firemní složky.

## Implementace
- Upload jde přímo z browseru (klient-side) na Google Apps Script Web App
- Apps Script uloží soubor do Drive složky `1jxnWBwCu0ik18D5sAFy4bE0t7q0aSUtZ`

## Apps Script URL
`https://script.google.com/macros/s/AKfycbys7cHeej0mo7sYmxuL60NAKkGpTVO-zUeZ2vHT5u0vigwPA-7zlsuxkcJ78ABf8_H4/exec`

## Drive složka
`https://drive.google.com/drive/folders/1jxnWBwCu0ik18D5sAFy4bE0t7q0aSUtZ`

## Apps Script kód
```javascript
function doPost(e) {
  var folder = DriveApp.getFolderById("1jxnWBwCu0ik18D5sAFy4bE0t7q0aSUtZ");
  var data = Utilities.base64Decode(e.parameters.data[0]);
  var blob = Utilities.newBlob(data, e.parameters.type[0], e.parameters.name[0]);
  var file = folder.createFile(blob);
  return ContentService.createTextOutput(JSON.stringify({ok: true, id: file.getId(), name: file.getName()}))
    .setMimeType(ContentService.MimeType.JSON);
}
```
