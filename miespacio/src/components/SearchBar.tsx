import { useState } from 'react';
import styles from '@/styles/CRUD.module.css';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface SearchBarProps {
    searchTerm: string;
    onSearchTermChange: (newSearchTerm: string) => void;
}

export default function SearchBar({ searchTerm, onSearchTermChange }: SearchBarProps) {
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = event.target.value;
        onSearchTermChange(newSearchTerm);
    };

    return (
        <form>
            <div className={styles.search_container}>
                <input type="text" value={searchTerm} onInput={handleInputChange} placeholder="Buscar" />
                <span className={styles.search_icon}><FontAwesomeIcon icon={faSearch}/></span>
            </div>
        </form>
    );
}
