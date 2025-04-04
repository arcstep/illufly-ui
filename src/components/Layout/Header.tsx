import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faBook, faMemory } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import UserMenu from '../Auth/UserMenu';
import { useRef } from 'react';

interface HeaderProps {
    username?: string;
    onLogout: () => void;
}

export default function Header({ username, onLogout }: HeaderProps) {
    const pathname = usePathname();
    const headerRef = useRef<HTMLElement>(null);

    // 使用固定尺寸的样式
    const headerStyle = {
        fontSize: '16px', // 固定字体大小
        width: '100%',
    };

    // 为各个元素添加固定样式
    const logoStyle = {
        fontSize: '1.25rem',
    };

    const navLinkStyle = {
        fontSize: '0.875rem',
    };

    const userMenuStyle = {
        fontSize: '0.875rem',
    };

    const isActive = (path: string) => pathname === path;

    return (
        <header
            ref={headerRef}
            className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 w-full"
            style={headerStyle}
        >
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center w-full">
                    <div className="flex flex-nowrap items-center flex-shrink-0">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/chat" className="font-bold text-gray-900 dark:text-white flex items-center gap-2" style={logoStyle}>
                                <span className="text-blue-500 dark:text-blue-400">✨🦋</span>
                                <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 text-transparent bg-clip-text">
                                    ILLUFLY
                                </span>
                            </Link>
                        </div>
                        <nav className="ml-6 flex space-x-4 flex-nowrap">
                            <Link
                                href="/chat"
                                className={`inline-flex items-center px-3 py-2 font-medium rounded-md ${isActive('/chat')
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                                style={navLinkStyle}
                            >
                                <FontAwesomeIcon icon={faComments as IconProp} className="mr-1.5 h-4 w-4" />
                                对话
                            </Link>
                            <Link
                                href="/memory"
                                className={`inline-flex items-center px-3 py-2 font-medium rounded-md ${isActive('/memory')
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                                style={navLinkStyle}
                            >
                                <FontAwesomeIcon icon={faMemory as IconProp} className="mr-1.5 h-4 w-4" />
                                记忆
                            </Link>
                            <Link
                                href="/docs"
                                className={`inline-flex items-center px-3 py-2 font-medium rounded-md ${isActive('/docs')
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                                style={navLinkStyle}
                            >
                                <FontAwesomeIcon icon={faBook as IconProp} className="mr-1.5 h-4 w-4" />
                                阅读
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center flex-shrink-0" style={userMenuStyle}>
                        <UserMenu username={username} onLogout={onLogout} />
                    </div>
                </div>
            </div>
        </header>
    );
} 