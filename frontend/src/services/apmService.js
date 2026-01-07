import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Get authentication token from localStorage
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

/**
 * Get all services for a specific agent/host
 * @param {string} agentId - Agent ID
 * @returns {Promise<Array>} List of services
 */
export const getAgentServices = async (agentId) => {
    try {
        const url = `${API_BASE_URL}/api/agents/${agentId}/services`;
        console.log('🌐 API Request:', url);
        console.log('🔑 Auth token:', localStorage.getItem('token') ? 'Present' : 'Missing');

        const response = await axios.get(url, getAuthHeaders());

        console.log('📥 API Response:', {
            status: response.status,
            dataLength: response.data?.length || 0,
            data: response.data
        });

        return response.data;
    } catch (error) {
        console.error('🚨 API Error in getAgentServices:', error);
        throw error;
    }
};

/**
 * Get service details
 * @param {string} agentId - Agent ID
 * @param {string} serviceName - Service name
 * @returns {Promise<Object>} Service details with processes
 */
export const getServiceDetails = async (agentId, serviceName) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/agents/${agentId}/services/${serviceName}`,
            getAuthHeaders()
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching service details:', error);
        throw error;
    }
};

/**
 * Get all processes for a specific agent/host
 * @param {string} agentId - Agent ID
 * @returns {Promise<Array>} List of processes
 */
export const getAgentProcesses = async (agentId) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/agents/${agentId}/processes`,
            getAuthHeaders()
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching agent processes:', error);
        throw error;
    }
};

/**
 * Get traces for a service
 * @param {string} serviceId - Service ID
 * @param {Object} filters - Filter options (startTime, endTime, status, error, limit, offset)
 * @returns {Promise<Object>} Traces and metadata
 */
export const getServiceTraces = async (serviceId, filters = {}) => {
    try {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null) {
                params.append(key, filters[key]);
            }
        });

        const response = await axios.get(
            `${API_BASE_URL}/api/services/${serviceId}/traces?${params.toString()}`,
            getAuthHeaders()
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching service traces:', error);
        throw error;
    }
};

/**
 * Get a single trace by ID
 * @param {string} traceId - Trace ID
 * @returns {Promise<Object>} Trace with spans
 */
export const getTrace = async (traceId) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/traces/${traceId}`,
            getAuthHeaders()
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching trace:', error);
        throw error;
    }
};

/**
 * Get trace performance analysis
 * @param {string} traceId - Trace ID
 * @returns {Promise<Object>} Performance breakdown and recommendations
 */
export const getTraceAnalysis = async (traceId) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/traces/${traceId}/analysis`,
            getAuthHeaders()
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching trace analysis:', error);
        throw error;
    }
};

/**
 * Get trace statistics for a service
 * @param {string} serviceId - Service ID
 * @param {number} hours - Time range in hours (default: 24)
 * @returns {Promise<Array>} Trace statistics per endpoint
 */
export const getServiceTraceStats = async (serviceId, hours = 24) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/services/${serviceId}/trace-stats?hours=${hours}`,
            getAuthHeaders()
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching trace stats:', error);
        throw error;
    }
};
