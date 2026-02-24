// backend/services/azure.service.js

const {
  BlobServiceClient,
  BlobSASPermissions,
  SASProtocol,
} = require("@azure/storage-blob");
const logger = require("../config/logger");

class AzureService {
  constructor() {
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containers = {
      recordings:
        process.env.AZURE_STORAGE_CONTAINER_RECORDINGS || "recordings",
      attachments:
        process.env.AZURE_STORAGE_CONTAINER_ATTACHMENTS || "attachments",
      answeraudios:
        process.env.AZURE_STORAGE_CONTAINER_ANSWER_AUDIOS || "answeraudios",
      gazetrackings:
        process.env.AZURE_STORAGE_CONTAINER_GAZETRACKINGS || "gazetrackings",
    };

    if (!this.connectionString) {
      logger.error(
        "Azure Storage 미설정: AZURE_STORAGE_CONNECTION_STRING 확인 필요",
      );
    }
  }

  _getTargetContainer(folder) {
    const allowedFolders = [
      "attachments",
      "recordings",
      "gazetrackings",
      "answeraudios",
    ];
    const targetFolder = allowedFolders.includes(folder)
      ? folder
      : "recordings";

    let targetContainerName = this.containers.recordings;
    if (targetFolder === "attachments" && this.containers.attachments) {
      targetContainerName = this.containers.attachments;
    } else if (
      targetFolder === "gazetrackings" &&
      this.containers.gazetrackings
    ) {
      targetContainerName = this.containers.gazetrackings;
    } else if (
      targetFolder === "answeraudios" &&
      this.containers.answeraudios
    ) {
      targetContainerName = this.containers.answeraudios;
    }

    return { targetFolder, targetContainerName };
  }

  async generateSasToken(fileName, folder) {
    if (!this.connectionString)
      throw new Error("Azure Storage configuration required");
    if (!fileName) throw new Error("fileName is required");

    const { targetFolder, targetContainerName } =
      this._getTargetContainer(folder);

    // 단순화: 별도 컨테이너를 쓰거나, 폴더명과 컨테이너명이 같으면 prefix 없음
    const isSeparateContainer =
      targetContainerName !== this.containers.recordings;
    const isSameName = targetContainerName === targetFolder;

    const blobName =
      isSeparateContainer || isSameName
        ? fileName
        : `${targetFolder}/${fileName}`;

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      this.connectionString,
    );
    const containerClient =
      blobServiceClient.getContainerClient(targetContainerName);

    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const sasUrl = await blockBlobClient.generateSasUrl({
      containerName: targetContainerName,
      blobName,
      permissions: BlobSASPermissions.parse("racw"),
      startsOn: new Date(Date.now() - 5 * 60 * 1000), // 5분 전 (Clock Skew)
      expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간
      protocol: SASProtocol.Https,
    });

    return sasUrl;
  }

  async listBlobs(folder, prefix = "") {
    if (!this.connectionString)
      throw new Error("Azure Storage configuration required");

    const { targetFolder, targetContainerName } =
      this._getTargetContainer(folder);

    // 컨테이너 분리 운용 여부
    const useSeparateContainers =
      !!this.containers.attachments &&
      this.containers.attachments !== this.containers.recordings;

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      this.connectionString,
    );
    const containerClient =
      blobServiceClient.getContainerClient(targetContainerName);

    const exists = await containerClient.exists();
    if (!exists) {
      return [];
    }

    // 검색 접두어 설정
    let searchPrefix = prefix;
    if (!useSeparateContainers && targetFolder !== "recordings") {
      searchPrefix = prefix ? `${targetFolder}/${prefix}` : `${targetFolder}/`;
    } else if (!useSeparateContainers && targetFolder === "recordings") {
      searchPrefix = prefix ? `${targetFolder}/${prefix}` : `${targetFolder}/`;
    }

    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat({
      prefix: searchPrefix,
    })) {
      blobs.push(blob.name);
    }

    return blobs;
  }
}

module.exports = new AzureService();
