import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faHistory } from '@fortawesome/free-solid-svg-icons';
import UserMenu from '../Auth/UserMenu';

export default function Header({
    isAgentListVisible,
    setIsAgentListVisible,
    isHistoryListVisible,
    setIsHistoryListVisible,
    username,
    onLogout,
    onFetchUser,
    onRefreshToken
}) {
    return (
        <header className="flex justify-between items-center mb-4">
            <h1 className="text-xl md:text-2xl font-bold">✨🦋 与智能体对话</h1>
            <div className="flex items-center">
                <button
                    onClick={() => setIsAgentListVisible(!isAgentListVisible)}
                    className="mr-2 bg-gray-300 text-black px-2 py-1 rounded hover:bg-gray-400"
                >
                    <FontAwesomeIcon
                        icon={faRobot}
                        style={{ color: isAgentListVisible ? 'darkblue' : 'gray' }}
                    />
                </button>
                <button
                    onClick={() => setIsHistoryListVisible(!isHistoryListVisible)}
                    className="mr-2 bg-gray-300 text-black px-2 py-1 rounded hover:bg-gray-400"
                >
                    <FontAwesomeIcon
                        icon={faHistory}
                        style={{ color: isHistoryListVisible ? 'darkblue' : 'gray' }}
                    />
                </button>
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