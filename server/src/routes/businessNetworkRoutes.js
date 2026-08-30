import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  getCategories, createCategory, updateCategory, deleteCategory, createSpecialty, deleteSpecialty,
  getChapters, getChapterById, createChapter, updateChapter, deleteChapter, assignChapterAdmin, removeChapterAdmin, getAdminUsersList,
  getVendorProfile, updateVendorProfile,
  applyToChapter, getMembershipRequests, decideMembershipRequest, suspendOrRemoveMember, getMyMemberships, leaveChapter,
  giveReferral, getReferrals, getReferralById, updateReferralStatus, addReferralNote,
  postRequirement, getRequirements, getMatchingMembers,
  createMeeting, getMeetings, updateMeetingStatus, recordAttendance, getMeetingAttendanceList,
  submitVisitorRequest, getVisitors, decideVisitorRequest,
  getSuperAdminDashboard, getAdminDashboard, getVendorDashboard
} from '../controllers/businessNetworkController.js';

const router = express.Router();

// Apply auth protection to all routes
router.use(protect);

// 1. Categories & Specialties
router.get('/categories', getCategories);
router.get('/admins', authorize('SUPER_ADMIN'), getAdminUsersList);
router.post('/categories', authorize('SUPER_ADMIN'), createCategory);
router.put('/categories/:id', authorize('SUPER_ADMIN'), updateCategory);
router.delete('/categories/:id', authorize('SUPER_ADMIN'), deleteCategory);
router.post('/specialties', authorize('SUPER_ADMIN'), createSpecialty);
router.delete('/specialties/:id', authorize('SUPER_ADMIN'), deleteSpecialty);

// 2. Chapters
router.get('/chapters', getChapters);
router.get('/chapters/:id', getChapterById);
router.post('/chapters', authorize('SUPER_ADMIN'), createChapter);
router.put('/chapters/:id', authorize('SUPER_ADMIN'), updateChapter);
router.delete('/chapters/:id', authorize('SUPER_ADMIN'), deleteChapter);
router.post('/chapters/:id/admins', authorize('SUPER_ADMIN'), assignChapterAdmin);
router.delete('/chapters/:id/admins/:adminId', authorize('SUPER_ADMIN'), removeChapterAdmin);

// 3. Vendor Profiles
router.get('/profiles/:userId', getVendorProfile);
router.post('/profiles', authorize('VENDOR'), updateVendorProfile);

// 4. Chapter Membership Request & Membership Flow
router.post('/membership-requests', authorize('VENDOR'), applyToChapter);
router.get('/membership-requests', authorize('ADMIN', 'SUPER_ADMIN'), getMembershipRequests);
router.put('/membership-requests/:id/decide', authorize('ADMIN', 'SUPER_ADMIN'), decideMembershipRequest);
router.put('/members/:id/status', authorize('ADMIN', 'SUPER_ADMIN'), suspendOrRemoveMember);
router.get('/my-memberships', authorize('VENDOR'), getMyMemberships);
router.delete('/my-memberships', authorize('VENDOR'), leaveChapter);

// 5. Referral System
router.post('/referrals', authorize('VENDOR'), giveReferral);
router.get('/referrals', getReferrals);
router.get('/referrals/:id', getReferralById);
router.put('/referrals/:id/status', authorize('VENDOR'), updateReferralStatus);
router.post('/referrals/:id/notes', addReferralNote);

// 6. Business Requirements & Matching
router.post('/requirements', authorize('VENDOR'), postRequirement);
router.get('/requirements', getRequirements);
router.get('/requirements/:id/matches', getMatchingMembers);

// 7. Meeting Management
router.post('/meetings', authorize('ADMIN', 'SUPER_ADMIN'), createMeeting);
router.get('/meetings', getMeetings);
router.put('/meetings/:id/status', authorize('ADMIN', 'SUPER_ADMIN'), updateMeetingStatus);
router.post('/meetings/:id/attendance', authorize('ADMIN', 'SUPER_ADMIN'), recordAttendance);
router.get('/meetings/:id/attendance', getMeetingAttendanceList);

// 8. Visitor System
router.post('/visitors', submitVisitorRequest);
router.get('/visitors', authorize('VENDOR', 'ADMIN', 'SUPER_ADMIN'), getVisitors);
router.put('/visitors/:id/decide', authorize('ADMIN', 'SUPER_ADMIN'), decideVisitorRequest);

// 9. Dashboards & Analytics
router.get('/dashboard/superadmin', authorize('SUPER_ADMIN'), getSuperAdminDashboard);
router.get('/dashboard/admin', authorize('ADMIN', 'SUPER_ADMIN'), getAdminDashboard);
router.get('/dashboard/vendor', authorize('VENDOR'), getVendorDashboard);

export default router;
