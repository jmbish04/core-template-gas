# Convert Google Document to Markdown and vice versa using Google Apps Script

![](https://tanaikech.github.io/image-storage/20240723a/fig1.png)

# Description

Great news for fans of both Google Docs and Markdown! Google Docs recently acquired the ability to export documents directly into the markdown format. [Ref](https://workspaceupdates.googleblog.com/2024/07/import-and-export-markdown-in-google-docs.html)

This functionality extends beyond the user interface, with early indications suggesting the Google Drive API might also be capable of converting between Google Docs and Markdown. I confirmed that this could also be achieved by Drive API. This opens exciting possibilities for automated workflows.

This report introduces the following 2 sample scripts to explore this potential.

# Sample scripts

The sample script uses Drive API. So, please enable Drive API at Advanced Google services. [Ref](https://developers.google.com/apps-script/guides/services/advanced#enable_advanced_services)

## 1. Convert Google Document to markdown

Please set the document ID of the Google Document.

```javascript
function sample1() {
  // Please set your Document ID.
  const documentId = "###";

  const url = `https://docs.google.com/feeds/download/documents/export/Export?exportFormat=markdown&id=${documentId}`;
  const res = UrlFetchApp.fetch(url, {
    headers: { authorization: "Bearer " + ScriptApp.getOAuthToken() },
  });
  const blob = res.getBlob();
  DriveApp.createFile(blob);
}
```

### Testing

When the following sample Google Document is used,

![](https://tanaikech.github.io/image-storage/20240723a/fig2.png)

the following result is obtained.

```
sample text 1

| a1 | b1 | c1 |
| :---- | :---- | :---- |
| a2 | b2 | c2 |

sample text 2

* sample option1
* sample option2
* sample option3

sample text 3
```

## 2. Convert markdown to Google Document

In this case, the sample script is very simple. Please set the file ID of the markdown file.

```javascript
function sample2() {
  // Please set the file ID of the markdown file on your Google Drive.
  const fileId = "###";

  Drive.Files.copy({ mimeType: MimeType.GOOGLE_DOCS }, fileId, {
    supportsAllDrives: true,
  });
}
```

### Testing

When the following sample markdown is used,

```
sample text 1

| a1 | b1 | c1 |
| :---- | :---- | :---- |
| a2 | b2 | c2 |

sample text 2

* sample option1
* sample option2
* sample option3

sample text 3
```

the following result is obtained.

![](https://tanaikech.github.io/image-storage/20240723a/fig2.png)

# Note

- Currently, embedding images in Google Documents and then converting to Markdown format results in image conversion to the `[image1]: <data:image/png;base64,###>` format. Unfortunately, this conversion to Google Documents produces a broken image. As a temporary solution, manually replacing the broken image with a valid image generated from the data URL using a script is necessary when converting Markdown with images. However, I believe that this issue will be resolved in a future update.
- As additional information, it is considered that when this process is used, for example, the markdown format can be converted to HTML and vice versa. The markdown format can be converted to PDF format and vice versa, and so on.
- While the provided scripts are designed for Google Apps Script, this process can also be implemented using other programming languages by leveraging the appropriate endpoint and Drive API.
- Logo of markdown is from [here](https://github.com/dcurtis/markdown-mark/tree/master/svg).

# Reference

- [Export MIME types for Google Workspace documents](https://developers.google.com/drive/api/guides/ref-export-formats)
