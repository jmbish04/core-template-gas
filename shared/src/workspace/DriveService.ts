export class DriveServiceHelper {
  static createTextFile(name: string, content: string): {id: string; url: string} {
    const file = DriveApp.createFile(name, content);
    return {id: file.getId(), url: file.getUrl()};
  }

  static listFilesByName(name: string): Array<{id: string; name: string; url: string}> {
    const files = DriveApp.getFilesByName(name);
    const results = [];

    while (files.hasNext()) {
      const file = files.next();
      results.push({id: file.getId(), name: file.getName(), url: file.getUrl()});
    }

    return results;
  }
}
