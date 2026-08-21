const AWS = require('aws-sdk');
const uuid = require('uuid');

const s3configured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET);

exports.presign = async (req, res) => {
    const { filename, contentType, employeeId } = req.body;
    if (!filename || !contentType) return res.status(400).json({ error: 'Missing filename or contentType' });
    // basic auth check: user must be owner or admin
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!s3configured) {
        // return a mock url and key so frontend can register the document
        const key = `mock/${uuid.v4()}_${filename}`;
        return res.json({ url: `https://example.com/${key}`, key, expiresIn: 3600 });
    }
    try {
        const s3 = new AWS.S3({ region: process.env.AWS_REGION });
        const key = `${employeeId || 'public'}/${uuid.v4()}_${filename}`;
        const params = { Bucket: process.env.AWS_S3_BUCKET, Key: key, ContentType: contentType, Expires: 60 * 10 };
        const url = await s3.getSignedUrlPromise('putObject', params);
        res.json({ url, key, expiresIn: 600 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
