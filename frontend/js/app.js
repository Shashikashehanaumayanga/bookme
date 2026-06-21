function displayBooks(books) {
  const container = document.getElementById("bookContainer");
  container.innerHTML = "";

  books.forEach(book => {
    container.innerHTML += `
      <div class="book-card">

        <a href="book-details.html?id=${book.id}">
          <img src="http://localhost:5000${book.image_url}" alt="${book.title}">
        </a>

        <h3>
          <a href="book-details.html?id=${book.id}">
            ${book.title}
          </a>
        </h3>

        <p>${book.author}</p>
        <h4>Rs. ${book.price}</h4>

      </div>
    `;
  });
}
function loadBooks() {
  fetch("http://localhost:5000/api/books/all-books")
    .then(res => res.json())
    .then(data => displayBooks(data))
    .catch(err => console.log(err));
}

function searchBooks() {
  const keyword = document.getElementById("searchBox").value;

  if (keyword.trim() === "") {
    loadBooks();
    return;
  }

  fetch(`http://localhost:5000/api/books/search?keyword=${keyword}`)
    .then(res => res.json())
    .then(data => displayBooks(data))
    .catch(err => console.log(err));
}

loadBooks();