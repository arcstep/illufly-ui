import api from './api';

// 获取所有文件列表
export const get_markmeta_files = async (onLoadFiles, onError) => {
    api.get('/api/markmeta/files')
        .then(onLoadFiles)
        .catch(onError);
};

// 获取单个文件内容
export const get_markmeta_file = async (path, onLoadFile, onError) => {
    api.get('/api/markmeta/file', {
        params: { path }
    })
        .then(onLoadFile)
        .catch(onError);
};

// 创建新文件
export const create_markmeta_file = async (path, content, onSuccess, onError) => {
    const formData = new FormData();
    formData.append('path', path);
    formData.append('content', content);

    api.post('/api/markmeta/file', formData)
        .then(onSuccess)
        .catch(onError);
};

// 更新文件内容
export const update_markmeta_file = async (path, content, onSuccess, onError) => {
    const formData = new FormData();
    formData.append('path', path);
    formData.append('content', content);

    api.put('/api/markmeta/file', formData)
        .then(onSuccess)
        .catch(onError);
};

// 删除文件
export const delete_markmeta_file = async (path, onSuccess, onError) => {
    const formData = new FormData();
    formData.append('path', path);

    api.delete('/api/markmeta/file', {
        data: formData
    })
        .then(onSuccess)
        .catch(onError);
};