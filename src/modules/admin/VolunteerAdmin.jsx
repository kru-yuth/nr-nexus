import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

const VolunteerAdmin = () => {
    const { user, profileData } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        supervisor: '', // Will be set in useEffect
        totalSlots: '',
        points: '',
        location: '',
        date: '',
        description: ''
    });

    useEffect(() => {
        if (user?.displayName || profileData?.Name) {
            setFormData(prev => ({
                ...prev,
                supervisor: user.displayName || profileData.Name || ''
            }));
        }
        fetchJobs();
    }, [user, profileData]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'volunteer_jobs'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const jobsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setJobs(jobsData);
        } catch (error) {
            console.error("Error fetching jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const totalSlots = parseInt(formData.totalSlots);
            const points = parseInt(formData.points);

            await addDoc(collection(db, 'volunteer_jobs'), {
                title: formData.title,
                supervisor: formData.supervisor,
                totalSlots: totalSlots,
                remainingSlots: totalSlots,
                points: points,
                location: formData.location,
                date: formData.date,
                description: formData.description,
                status: 'active',
                createdBy: user.uid,
                createdAt: serverTimestamp()
            });

            // Reset form (keep supervisor)
            setFormData({
                title: '',
                supervisor: formData.supervisor,
                totalSlots: '',
                points: '',
                location: '',
                date: '',
                description: ''
            });

            fetchJobs();
            alert("Job posted successfully!");

        } catch (error) {
            console.error("Error posting job:", error);
            alert(`Failed to post job: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseJob = async (jobId) => {
        if (!window.confirm("Are you sure you want to close this job?")) return;

        try {
            const jobRef = doc(db, 'volunteer_jobs', jobId);
            await updateDoc(jobRef, {
                status: 'closed'
            });
            fetchJobs(); // Refresh list to show updated status
        } catch (error) {
            console.error("Error closing job:", error);
            alert("Failed to close job.");
        }
    };

    const handleViewApplicants = (jobId) => {
        // Placeholder navigation
        alert(`Navigate to Applicants for Job ID: ${jobId}`);
        // navigate(`/admin/volunteer/applicants/${jobId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 relative">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Volunteer Management</h1>
                    <p className="text-gray-500 mt-2">Post and manage volunteer opportunities.</p>
                </div>

                {/* Post Job Form */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-blue-600">Post New Job</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Job Title (ชื่องาน)</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Supervisor (ผู้รับผิดชอบ)</label>
                                <input
                                    type="text"
                                    name="supervisor"
                                    value={formData.supervisor}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Total Slots (จำนวนที่รับ)</label>
                                <input
                                    type="number"
                                    name="totalSlots"
                                    value={formData.totalSlots}
                                    onChange={handleChange}
                                    required
                                    min="1"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Points (คะแนน)</label>
                                <input
                                    type="number"
                                    name="points"
                                    value={formData.points}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Location (สถานที่)</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date/Time (วันเวลานัดหมาย)</label>
                                <input
                                    type="datetime-local"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description (รายละเอียด)</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows="3"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {submitting ? 'Saving...' : 'Post Job'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Manage Jobs List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-800">Manage Jobs</h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p>Loading jobs...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slots</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {jobs.length > 0 ? (
                                        jobs.map((job) => (
                                            <tr key={job.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{job.title}</div>
                                                    <div className="text-xs text-gray-500">{job.location}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(job.date).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className={job.remainingSlots === 0 ? 'text-red-500 font-bold' : 'text-green-600'}>
                                                        {job.remainingSlots}
                                                    </span>
                                                    {' / '}
                                                    {job.totalSlots}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                    {job.points}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {job.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleViewApplicants(job.id)}
                                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                                    >
                                                        View Applicants
                                                    </button>
                                                    {job.status === 'active' && (
                                                        <button
                                                            onClick={() => handleCloseJob(job.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Close Job
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                                No volunteer jobs found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VolunteerAdmin;
