import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faHistory } from '@fortawesome/free-solid-svg-icons';

export default function Header({ isFirstColumnVisible, setIsFirstColumnVisible, isSecondColumnVisible, setIsSecondColumnVisible }) {
    return (
        <header className="flex justify-between items-center mb-4">
            <h1 className="text-xl md:text-2xl font-bold">对话应用</h1>
            <div>
                <button
                    onClick={() => setIsFirstColumnVisible(!isFirstColumnVisible)}
                    className="mr-2 bg-gray-300 text-black px-2 py-1 rounded hover:bg-gray-400"
                >
                    <FontAwesomeIcon
                        icon={faRobot}
                        style={{ color: isFirstColumnVisible ? 'darkblue' : 'gray' }}
                    />
                </button>
                <button
                    onClick={() => setIsSecondColumnVisible(!isSecondColumnVisible)}
                    className="bg-gray-300 text-black px-2 py-1 rounded hover:bg-gray-400"
                >
                    <FontAwesomeIcon
                        icon={faHistory}
                        style={{ color: isSecondColumnVisible ? 'darkblue' : 'gray' }}
                    />
                </button>
            </div>
        </header>
    );
}