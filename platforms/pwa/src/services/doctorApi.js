const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const doctorApi = {
    // Get all active doctors
    async getDoctors() {
        const response = await fetch(`${API_BASE_URL}/api/v2/doctors`);
        if (!response.ok) throw new Error('Failed to fetch doctors');
        return response.json();
    },

    // Get doctor detail with reviews
    async getDoctorDetail(doctorId) {
        const response = await fetch(`${API_BASE_URL}/api/v2/doctors/${doctorId}`);
        if (!response.ok) throw new Error('Failed to fetch doctor detail');
        return response.json();
    },

    // Get doctor availability
    async getDoctorAvailability(doctorId, date) {
        const url = new URL(`${API_BASE_URL}/api/v2/doctors/${doctorId}/availability`);
        if (date) url.searchParams.append('date', date);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch availability');
        return response.json();
    },

    // Book appointment
    async bookAppointment(doctorId, data) {
        const response = await fetch(`${API_BASE_URL}/api/v2/doctors/${doctorId}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to book appointment');
        }
        return response.json();
    },

    // Get user appointments
    async getUserAppointments(userId) {
        const response = await fetch(`${API_BASE_URL}/api/v2/users/${userId}/appointments`);
        if (!response.ok) throw new Error('Failed to fetch appointments');
        return response.json();
    },

    // Cancel appointment
    async cancelAppointment(appointmentId) {
        const response = await fetch(`${API_BASE_URL}/api/v2/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to cancel appointment');
        return response.json();
    },

    // Add review
    async addReview(doctorId, data) {
        const response = await fetch(`${API_BASE_URL}/api/v2/doctors/${doctorId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to add review');
        return response.json();
    }
};

export default doctorApi;
