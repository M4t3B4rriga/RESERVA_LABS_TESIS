import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight, faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/CRUD.module.css';
interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const pageCount = Math.ceil(total / limit);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pageCount) {
      onChange(newPage);
    }
  };

  const isFirstPage = page === 1;
  const isLastPage = page === pageCount;

  return (
    <div className={styles.pagination_container}>
      <div className={styles.pagination_buttons}>
        <button
          onClick={() => handlePageChange(1)}
          disabled={isFirstPage}
        >
          <FontAwesomeIcon icon={faAngleDoubleLeft} />
        </button>
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={isFirstPage}
        >
          <FontAwesomeIcon icon={faAngleLeft} />
        </button>
        <span className={styles.pagination_currentpage}>
          {page}
        </span>
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={isLastPage}
        >
          <FontAwesomeIcon icon={faAngleRight} />
        </button>
        <button
          onClick={() => handlePageChange(pageCount)}
          disabled={isLastPage}
        >
          <FontAwesomeIcon icon={faAngleDoubleRight} />
        </button>
      </div>
      <span>
        Mostrando resultados {page * limit - limit + 1} - {Math.min(page * limit, total)} de {total}
      </span>
    </div>
  );
}
