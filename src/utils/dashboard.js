import api from './api';

export const dashboardData = async () => {
    try {
        // const response = await api.get('/api/dashboard/data', {
        //     withCredentials: true,
        // });

        // return response.data;
        return {}
    } catch (error) {
        throw new Error('获取仪表盘数据失败');
    }
};
