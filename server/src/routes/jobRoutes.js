import express from 'express';
import { 
    getPublicJobs, 
    getPublicJobBySlug, 
    getVendorJobs, 
    createJob, 
    updateJob, 
    updateJobStatus, 
    deleteJob, 
    getJobApplications, 
    applyToJob,
    uploadResume,
    getUserJobApplications,
    updateApplicationStatus
} from '../controllers/jobController.js';
import { protect, authorize, optionalAuth } from '../middlewares/authMiddleware.js';
import { uploadResumeFile } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Public/User Routes
router.post('/upload-resume', protect, uploadResumeFile, uploadResume);
router.post('/apply', protect, applyToJob);
router.get('/user/applications', protect, getUserJobApplications);

// Public routes
router.get('/', getPublicJobs);
router.get('/:slug', getPublicJobBySlug);

// Vendor Routes (Job Management)
router.get('/vendor/list', protect, authorize('VENDOR'), getVendorJobs);
router.post('/vendor', protect, authorize('VENDOR'), createJob);
router.put('/vendor/:id', protect, authorize('VENDOR'), updateJob);
router.delete('/vendor/:id', protect, authorize('VENDOR'), deleteJob);
router.patch('/vendor/:id/status', protect, authorize('VENDOR'), updateJobStatus);

// Vendor Routes (Application Management)
router.get('/vendor/applications', protect, authorize('VENDOR'), getJobApplications);
router.patch('/vendor/applications/:id/status', protect, authorize('VENDOR'), updateApplicationStatus);

export default router;
