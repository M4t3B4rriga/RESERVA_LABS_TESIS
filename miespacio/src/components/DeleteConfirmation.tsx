import Modal from '@mui/material/Modal';
import styles from '@/styles/CRUD.module.css';

type DeleteConfirmationProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    registerName?: string;
}

export default function DeleteConfirmation(props: DeleteConfirmationProps) {
    const { isOpen, onClose, onConfirm, registerName } = props;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={onClose} className={styles.modal}>
            <div className={`${styles.card} ${styles.card_confirmation}`}>
                <h3>¿Está seguro?</h3>
                <div>Si inactiva el registro &apos;{registerName}&apos; solo un usuario autorizado podrá volver a activarlo.</div>
                <div className={styles.card_buttons_container}>
                    <button onClick={onClose} className={styles.cancel_button}>
                        Cancelar
                    </button>
                    <button onClick={handleConfirm} className={`${styles.confirm_button} ${styles.button_red}`}>
                        Confirmar
                    </button>
                </div>
            </div>
        </Modal>
    );
}