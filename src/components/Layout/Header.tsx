import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faBook, faMemory } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import UserMenu from '../Auth/UserMenu';
import { useSettings } from '@/context/SettingsContext';

interface HeaderProps {
    username?: string;
    onLogout: () => void;
}

export default function Header({ username, onLogout }: HeaderProps) {
    const pathname = usePathname();
    const { settings } = useSettings();

    const isActive = (path: string) => pathname === path;

    return (
        <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/chat" className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="text-blue-500 dark:text-blue-400">+</span>
                                <span className="text-blue-500 dark:text-blue-400">🦋</span>
                                <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 text-transparent bg-clip-text">
                                    ILLUFLY
                                </span>
                            </Link>
                        </div>
                        <nav className="ml-6 flex space-x-4">
                            <Link
                                href="/chat"
                                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/chat')
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                            >
                                <FontAwesomeIcon icon={faComments as IconProp} className="mr-1.5 h-4 w-4" />
                                对话
                            </Link>
                            <Link
                                href="/memory"
                                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/memory')
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                            >
                                <FontAwesomeIcon icon={faMemory as IconProp} className="mr-1.5 h-4 w-4" />
                                记忆
                            </Link>
                            <Link
                                href="/docs"
                                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive('/docs')
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                            >
                                <FontAwesomeIcon icon={faBook as IconProp} className="mr-1.5 h-4 w-4" />
                                文档
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center">
                        <UserMenu username={username} onLogout={onLogout} />
                    </div>
                </div>
            </div>
        </header>
    );
} 