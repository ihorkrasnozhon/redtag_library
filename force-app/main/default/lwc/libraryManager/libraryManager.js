import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getBooks from '@salesforce/apex/LibraryController.getBooks';
import deleteBook from '@salesforce/apex/LibraryController.deleteBook';
import deleteAuthor from '@salesforce/apex/LibraryController.deleteAuthor';
import exportToCSV from '@salesforce/apex/LibraryController.exportToCSV';

const libraryColumns = [
    { label: 'Title', fieldName: 'Name', type: 'text', sortable: true },
    { label: 'Author', fieldName: 'AuthorName', type: 'text', sortable: true },
    {
        type: 'action',
        typeAttributes: {
            rowActions: [
                { label: 'Delete Book', name: 'deleteBook' },
                { label: 'Update Book Info', name: 'updateBook' },
                { label: 'Delete Author', name: 'deleteAuthor' }
            ]
        }
    }
];

export default class LibraryManager extends LightningElement {
    searchKey = '';
    columns = libraryColumns;
    @track books = [];
    error;
    wiredResult;
    sortBy = 'Name';
    sortDirection = 'asc';

    @track isBookModalOpen = false;
    @track isAuthorModalOpen = false;
    @track isEditBookModalOpen = false;
    selectedBookId;

    @wire(getBooks, { searchInput: '$searchKey' })
    wiredBooks(result) {
        this.wiredResult = result;
        if (result.data) {
            this.books = result.data.map(book => ({
                ...book,
                AuthorName: book.Author__r ? book.Author__r?.Name : 'Not Defined Name'
            }));
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.books = undefined;
        }
    }


    handleNewBook() {
        this.isBookModalOpen = true;
    }

    closeBookModal() {
        this.isBookModalOpen = false;
    }

    handleNewAuthor() {
        this.isAuthorModalOpen = true;
    }

    closeAuthorModal() {
        this.isAuthorModalOpen = false;
    }

    handleUpdateBook(bookId) {
        this.selectedBookId = bookId;
        this.isEditBookModalOpen = true;
    }

    closeEditBookModal() {
        this.isEditBookModalOpen = false;
        this.selectedBookId = undefined;
    }
    handleSuccess(event) {
        this.isBookModalOpen = false;
        this.isAuthorModalOpen = false;
        this.isEditBookModalOpen = false;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Record saved successfully!',
                variant: 'success'
            })
        );

        return refreshApex(this.wiredResult);
    }




    handleSort(e) {
        const sortBy = e.detail.fieldName;
        const sortDirection = (this.sortBy === sortBy && this.sortDirection === 'asc') ? 'desc' : 'asc';

        this.sortBy = sortBy;
        this.sortDirection = sortDirection;

        this.sortData(sortBy, sortDirection);
    }

    sortData(sortBy, sortDirection) {
        let parsedBooks = JSON.parse(JSON.stringify(this.books));
        let isReverse = sortDirection === 'asc' ? 1 : -1;

        parsedBooks.sort((x, y) => {
            let valueX = x[sortBy] ? x[sortBy].toString().toLowerCase() : '';
            let valueY = y[sortBy] ? y[sortBy].toString().toLowerCase() : '';

            if (valueX < valueY) return -1 * isReverse;
            if (valueX > valueY) return 1 * isReverse;
            return 0;
        });

        this.books = parsedBooks;
    }

    handleSearchChange(event) {
        this.searchKey = event.target.value;
    }


    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        
        if (actionName === 'deleteBook') {
            this.handleDeleteBook(row.Id);
        }
        if (actionName === 'updateBook') {
            this.handleUpdateBook(row.Id);
        }
        if (actionName === 'deleteAuthor') {
            this.handleDeleteAuthor(row.Author__c);
        }
    }



    async handleDeleteBook(bookId) {
        try {
            await deleteBook({ bookId });
            this.showToast('Success', 'Book deleted successfully', 'success');
            return refreshApex(this.wiredResult);
        } catch (error) {
            this.showErrorToast(error, 'Error deleting book');
        }
    }

    async handleDeleteAuthor(authorId) {
        try {
            await deleteAuthor({ authorId });
            this.showToast('Success', 'Author deleted successfully', 'success');
            return refreshApex(this.wiredResult);
        } catch (error) {
            this.showErrorToast(error, 'Error deleting author');
        }
    }

    async handleExportCSV() {
        try {
            const csvContent = await exportToCSV();
            if (!csvContent) return;
            const BOM = '\uFEFF';
            const fullContent = BOM + csvContent;
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(fullContent);

            const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = "library.csv";
            link.click();
        } catch (error) {
            this.showErrorToast(error, 'Export failed');
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    showErrorToast(error, defaultMessage) {
        this.showToast('Error', error.body?.message || defaultMessage, 'error');
    }
}