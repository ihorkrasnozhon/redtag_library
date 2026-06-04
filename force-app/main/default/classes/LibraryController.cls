public with sharing class LibraryController {
    
    @AuraEnabled(cacheable=true)
    public static List<Book__c> getBooks(String searchInput) {
        if(String.isNotBlank(searchInput)) {
            String searchPrompt = '%' + searchInput + '%';

            return [SELECT Id, Name, Author__r.Name FROM Book__c WHERE Name LIKE :searchPrompt OR Author__r.Name LIKE :searchPrompt WITH SECURITY_ENFORCED LIMIT 5];
        }

        return [SELECT Id, Name, Author__r.Name FROM Book__c WITH SECURITY_ENFORCED LIMIT 5];
    }
    
    @AuraEnabled
    public static void deleteBook(Id bookId){
        if(bookId != null) {
            delete [SELECT Id FROM Book__c WHERE Id = :bookId WITH SECURITY_ENFORCED];
        }
    }

    @AuraEnabled
    public static void deleteAuthor(Id authorId){
        if(authorId != null) {
            delete [SELECT Id FROM Author__c WHERE Id = :authorId WITH SECURITY_ENFORCED];
        }
    }


    @AuraEnabled(cacheable=true)
    public static String exportToCSV() {
        String header = 'Title,Author\n';
        String csvBody = '';

        List<Book__c> books = [SELECT Name, Author__r.Name FROM Book__c WITH SECURITY_ENFORCED];

        for(Book__c b : books) {
            String author = b.Author__r != null ? b.Author__r.Name : 'Not Defined Name';
            csvBody += '"' + b.Name + '","' + author + '"\n';
        }
        return header + csvBody;
    }
}