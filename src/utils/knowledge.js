import api from './api';

// 定义知识项的类型
/**
 * @typedef {Object} KnowledgeItem
 * @property {string} id
 * @property {string} summary
 * @property {string[]} tags
 * @property {string|null} source
 */

/**
 * @typedef {Object} KnowledgeListResponse
 * @property {number} total
 * @property {number} total_pages
 * @property {number} current_page
 * @property {KnowledgeItem[]} items
 * @property {Object} filters
 */

// 获取知识列表
export const get_knowledge_list = async ({
    page = 1,
    pageSize = 10,
    sortBy = 'id',
    reverse = false,
    tags = null,
    matchAllTags = true
} = {}) => {
    const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        reverse,
        ...(tags?.length && { tags, match_all_tags: matchAllTags })
    };

    try {
        const response = await api.get('/api/knowledge', { params });
        return response.data;
    } catch (error) {
        console.error('获取知识列表失败:', error);
        throw error;
    }
};

// 获取单个知识内容
export const get_knowledge = async (id) => {
    try {
        const response = await api.get(`/api/knowledge/${id}`);
        return response.data;
    } catch (error) {
        console.error(`获取知识[${id}]失败:`, error);
        throw error;
    }
};

// 创建新知识
export const create_knowledge = async ({
    content,
    tags = [],
    summary = '',
    source = null
}, onSuccess, onError) => {
    const formData = new FormData();
    formData.append('content', content);
    if (tags.length > 0) {
        tags.forEach(tag => formData.append('tags', tag));
    }
    if (summary) formData.append('summary', summary);
    if (source) formData.append('source', source);

    api.post('/api/knowledge', formData)
        .then(onSuccess)
        .catch(onError);
};

// 更新知识内容
export const update_knowledge = async (id, {
    content = null,
    tags = null,
    summary = null,
    source = null
}) => {
    const formData = new FormData();

    if (content !== null) {
        formData.append('content', content);
    }

    if (tags !== null) {
        formData.append('tags', tags.join(','));
    }

    if (summary !== null) {
        formData.append('summary', summary);
    }

    if (source !== null) {
        formData.append('source', source);
    }

    try {
        const response = await api.put(`/api/knowledge/${id}`, formData);
        return response.data;
    } catch (error) {
        console.error(`更新知识[${id}]失败:`, error);
        throw error;
    }
};

// 删除知识
export const delete_knowledge = async (id, onSuccess, onError) => {
    api.delete(`/api/knowledge/${id}`)
        .then(onSuccess)
        .catch(onError);
};