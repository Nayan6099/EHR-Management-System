/**
 * Database Configuration
 * 
 * MongoDB connection settings and configuration
 */

module.exports = {
    // MongoDB connection URI
    mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ehr_database',
    
    // Database name
    dbName: process.env.MONGODB_DB_NAME || 'ehr_database',
    
    // Connection options
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // useCreateIndex: true,  // Deprecated in Mongoose 6+
        // useFindAndModify: false,  // Deprecated in Mongoose 6+
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4  // Use IPv4, skip trying IPv6
    },
    
    // Collection names
    collections: {
        ehrMetadata: 'ehrmetadata',
        users: 'users',
        auditLog: 'auditlog'
    },
    
    // Indexes to create on startup
    indexes: [
        {
            collection: 'ehrmetadata',
            index: { recordId: 1 },
            options: { unique: true }
        },
        {
            collection: 'ehrmetadata',
            index: { patientId: 1, uploadDate: -1 },
            options: {}
        },
        {
            collection: 'ehrmetadata',
            index: { ipfsHash: 1 },
            options: {}
        }
    ]
};