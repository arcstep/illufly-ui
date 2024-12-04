import Link from 'next/link';
import UserMenu from './Auth/UserMenu';

export default function Header({
    username,
    onLogout,
    onFetchUser,
    onRefreshToken,
    currentPath
}) {
    return (
        <header className="flex justify-between items-center fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white p-2">
            <h1 className="text-xl md:text-2xl font-bold">✨🦋 与智能体对话</h1>
            <div className="flex space-x-4">
                {['/publish', '/writing', '/knowledge', '/data', '/chat'].map((path) => (
                    <Link href={path} key={path}>
                        <span className={`px-3 py-1 rounded-full transition-all duration-300 ${currentPath === path ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white shadow-md' : 'bg-transparent text-gray-200 hover:bg-gray-600'}`}>
                            {path === '/publish' && '发布'}
                            {path === '/writing' && '写作'}
                            {path === '/knowledge' && '认知'}
                            {path === '/data' && '数据'}
                            {path === '/chat' && '对话'}
                        </span>
                    </Link>
                ))}
            </div>
            <div className="flex items-center">
                <UserMenu
                    username={username}
                    onLogout={onLogout}
                    onFetchUser={onFetchUser}
                    onRefreshToken={onRefreshToken}
                />
            </div>
        </header>
    );
}