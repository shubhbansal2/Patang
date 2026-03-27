import mongoose from 'mongoose';

const GRIDFS_BUCKET_NAME = 'subscriptionDocuments';

const getBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
  bucketName: GRIDFS_BUCKET_NAME,
});

export const storeSubscriptionDocument = async ({ buffer, filename, mimeType, ownerId, facilityType, documentType }) => (
  new Promise((resolve, reject) => {
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimeType,
      metadata: {
        ownerId: String(ownerId),
        facilityType,
        documentType,
      },
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        fileId: uploadStream.id,
        filename: uploadStream.filename,
      });
    });

    uploadStream.end(buffer);
  })
);

export const streamSubscriptionDocument = async ({ fileId, res }) => {
  const bucket = getBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  const [file] = await bucket.find({ _id: objectId }).toArray();

  if (!file) {
    return null;
  }

  if (file.contentType) {
    res.setHeader('Content-Type', file.contentType);
  }
  res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

  return bucket.openDownloadStream(objectId);
};
