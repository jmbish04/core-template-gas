/**
 * Shared Google Drive helpers translated from the upstream Apps Script examples
 * into typed, reusable primitives for this repository.
 */

/**
 * Portable metadata returned by most Drive operations.
 */
export interface DriveFileDescriptor {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Input used when renaming one or more Drive files.
 */
export interface DriveRenameRequest {
  fileId: string;
  newName: string;
}

/**
 * Input used when moving a file into a destination folder.
 */
export interface DriveMoveRequest {
  fileId: string;
  destinationFolderId: string;
}

/**
 * Input used when creating a new binary file from base64-encoded content.
 */
export interface DriveUploadRequest {
  filename: string;
  base64Data: string;
  mimeType: string;
}

/**
 * Input used when adjusting Drive sharing policy.
 */
export interface DriveSharingRequest {
  fileId: string;
  access: GoogleAppsScript.Drive.Access;
  permission: GoogleAppsScript.Drive.Permission;
}

/**
 * Drive service with rich, well-documented operations suitable for direct
 * project imports and for tool-definition wrappers.
 */
export class DriveServiceHelper {
  /**
   * Creates a plain-text file in the caller's Drive root.
   *
   * @param name Filename shown in Drive.
   * @param content UTF-8 content written to the new file.
   * @returns Normalized descriptor for chaining into later actions.
   */
  static createTextFile(name: string, content: string): DriveFileDescriptor {
    return this.toDescriptor(DriveApp.createFile(name, content));
  }

  /**
   * Creates a binary file from base64 content.
   *
   * @param request Upload request including filename, bytes, and MIME type.
   * @returns Descriptor for the newly created Drive file.
   */
  static createFileFromBase64(request: DriveUploadRequest): DriveFileDescriptor {
    const blob = Utilities.newBlob(
      Utilities.base64Decode(request.base64Data),
      request.mimeType,
      request.filename
    );
    return this.toDescriptor(DriveApp.createFile(blob));
  }

  /**
   * Lists files matching an exact Drive filename.
   *
   * @param name Filename to search for.
   * @returns All matching files accessible to the script user.
   */
  static listFilesByName(name: string): DriveFileDescriptor[] {
    const files = DriveApp.getFilesByName(name);
    const results: DriveFileDescriptor[] = [];

    while (files.hasNext()) {
      results.push(this.toDescriptor(files.next()));
    }

    return results;
  }

  /**
   * Runs a Drive search query using DriveApp semantics.
   *
   * @param query Drive query such as `title contains "invoice" and trashed = false`.
   * @param limit Upper bound to keep large result sets bounded for tool callers.
   * @returns Matching file descriptors.
   */
  static searchFiles(query: string, limit = 100): DriveFileDescriptor[] {
    const iterator = DriveApp.searchFiles(query);
    const files: DriveFileDescriptor[] = [];

    while (iterator.hasNext() && files.length < limit) {
      files.push(this.toDescriptor(iterator.next()));
    }

    return files;
  }

  /**
   * Returns metadata plus base64 content for the first file matching a name.
   *
   * @param filename Filename to search for.
   * @returns Descriptor plus base64 content for transport across tool layers.
   */
  static downloadFirstFileByName(filename: string): DriveFileDescriptor & {base64Data: string} {
    const matches = DriveApp.searchFiles(`title contains "${filename.replace(/"/g, '\\"')}" and trashed = false`);
    if (!matches.hasNext()) {
      throw new Error(`No Drive file matching "${filename}" was found.`);
    }

    const file = matches.next();
    return {
      ...this.toDescriptor(file),
      base64Data: Utilities.base64Encode(file.getBlob().getBytes())
    };
  }

  /**
   * Renames files in bulk while returning per-file status strings.
   *
   * @param requests Rename operations to perform.
   * @returns Per-file summary for auditability.
   */
  static renameFiles(requests: DriveRenameRequest[]): string[] {
    return requests.map((request) => {
      const file = DriveApp.getFileById(request.fileId);
      const previousName = file.getName();
      file.setName(request.newName);
      return `Renamed "${previousName}" (${request.fileId}) to "${request.newName}".`;
    });
  }

  /**
   * Moves a Drive file into a destination folder.
   *
   * @param request Move request with file and destination folder identifiers.
   * @returns Descriptor of the moved file after the operation completes.
   */
  static moveFileToFolder(request: DriveMoveRequest): DriveFileDescriptor {
    const file = DriveApp.getFileById(request.fileId);
    const folder = DriveApp.getFolderById(request.destinationFolderId);
    file.moveTo(folder);
    return this.toDescriptor(file);
  }

  /**
   * Applies a Drive sharing rule to a file.
   *
   * @param request Sharing request describing access and permission levels.
   * @returns Updated file descriptor for confirmation.
   */
  static setSharing(request: DriveSharingRequest): DriveFileDescriptor {
    const file = DriveApp.getFileById(request.fileId);
    file.setSharing(request.access, request.permission);
    return this.toDescriptor(file);
  }

  /**
   * Creates a folder in the caller's Drive root or inside a supplied parent.
   *
   * @param name Folder name to create.
   * @param parentFolderId Optional destination folder.
   * @returns Descriptor for the created folder.
   */
  static createFolder(name: string, parentFolderId?: string): DriveFileDescriptor {
    const folder = parentFolderId
      ? DriveApp.getFolderById(parentFolderId).createFolder(name)
      : DriveApp.createFolder(name);
    return {
      id: folder.getId(),
      name: folder.getName(),
      mimeType: 'application/vnd.google-apps.folder',
      url: folder.getUrl()
    };
  }

  /**
   * Converts the native Drive file object into a serializable descriptor.
   *
   * @param file Raw Apps Script file object.
   * @returns Stable metadata for APIs, tools, and UI layers.
   */
  private static toDescriptor(file: GoogleAppsScript.Drive.File): DriveFileDescriptor {
    return {
      id: file.getId(),
      name: file.getName(),
      mimeType: file.getMimeType(),
      url: file.getUrl(),
      createdAt: file.getDateCreated().toISOString(),
      updatedAt: file.getLastUpdated().toISOString()
    };
  }
}
