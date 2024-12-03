import Link from 'next/link';
import UserMenu from './Auth/UserMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faHistory } from '@fortawesome/free-solid-svg-icons';

export default function Header({
    username,
    onLogout,
    onFetchUser,
    onRefreshToken,
    isAgentListVisible,
    setIsAgentListVisible,
    isHistoryListVisible,
    setIsHistoryListVisible,
    currentPath
}) {
    return (
        <header className="flex justify-between items-center fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white p-2">
            <h1 className="text-xl md:text-2xl font-bold">✨🦋 与智能体对话</h1>
            <div className="flex space-x-4">
                {['/square', '/share', '/write', '/knowledge', '/data', '/chat'].map((path) => (
                    <Link href={path} key={path}>
                        <span className={`px-3 py-1 rounded-full transition-all duration-300 ${currentPath === path ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white shadow-md' : 'bg-transparent text-gray-200 hover:bg-gray-600'}`}>
                            {path === '/square' && '广场'}
                            {path === '/share' && '分享'}
                            {path === '/write' && '写作'}
                            {path === '/knowledge' && '认知'}
                            {path === '/data' && '数据'}
                            {path === '/chat' && '对话'}
                        </span>
                    </Link>
                ))}
            </div>
            <div className="flex items-center">
                <div className="flex">
                    {setIsAgentListVisible && (
                        <button
                            onClick={() => setIsAgentListVisible(!isAgentListVisible)}
                            className={`mr-2 px-3 py-1 rounded-full transition-all duration-300 ${isAgentListVisible ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-lg' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                        >
                            <FontAwesomeIcon
                                icon={faRobot}
                                style={{ color: isAgentListVisible ? 'white' : 'lightgray' }}
                            />
                        </button>
                    )}
                    {setIsHistoryListVisible && (
                        <button
                            onClick={() => setIsHistoryListVisible(!isHistoryListVisible)}
                            className={`mr-2 px-3 py-1 rounded-full transition-all duration-300 ${isHistoryListVisible ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-lg' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                        >
                            <FontAwesomeIcon
                                icon={faHistory}
                                style={{ color: isHistoryListVisible ? 'white' : 'lightgray' }}
                            />
                        </button>
                    )}
                </div>

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