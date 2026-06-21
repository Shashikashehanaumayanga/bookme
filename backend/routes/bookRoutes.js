
const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");

// Upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Add Book with Image Upload
router.post("/add-book", upload.single("bookImage"), async (req, res) => {
  try {
    const { title, author, description, price, stock, category_id } = req.body;

    const image_url = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const result = await pool.query(
      `INSERT INTO books
      (title, author, description, price, stock, image_url, category_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        title,
        author,
        description,
        price,
        stock,
        image_url,
        category_id || null
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Get All Books
router.get("/all-books", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
// Search Books
router.get("/search", async (req, res) => {
  try {
    const keyword = req.query.keyword;

    const result = await pool.query(
      `SELECT * FROM books
       WHERE title ILIKE $1
       OR author ILIKE $1
       ORDER BY id DESC`,
      [`%${keyword}%`]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Delete Book
router.delete("/delete-book/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM books WHERE id = $1", [id]);

    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get One Book
router.get("/book/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM books WHERE id = $1",
      [id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Update Book
router.put("/update-book/:id", async (req, res) => {
  try {

    const { id } = req.params;

    const {
      title,
      author,
      description,
      price,
      stock
    } = req.body;

    const result = await pool.query(
      `UPDATE books
       SET title=$1,
           author=$2,
           description=$3,
           price=$4,
           stock=$5
       WHERE id=$6
       RETURNING *`,
      [
        title,
        author,
        description,
        price,
        stock,
        id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
// Add To Cart
router.post("/add-to-cart", async (req, res) => {
  try {
    const { user_id, book_id, quantity } = req.body;

    const result = await pool.query(
      `INSERT INTO cart (user_id, book_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, book_id, quantity || 1]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View Cart
router.get("/cart/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT cart.id, cart.quantity, books.title, books.price, books.image_url
       FROM cart
       JOIN books ON cart.book_id = books.id
       WHERE cart.user_id = $1`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Remove item from cart
router.delete("/cart/remove/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM cart WHERE id = $1", [id]);

    res.json({ message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update Cart Quantity
router.put("/cart/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const result = await pool.query(
      `UPDATE cart
       SET quantity = $1
       WHERE id = $2
       RETURNING *`,
      [quantity, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
// Place Order
router.post("/place-order", async (req, res) => {
  try {
    const { user_id } = req.body;

    const cartItems = await pool.query(
      `SELECT cart.book_id, cart.quantity, books.price
       FROM cart
       JOIN books ON cart.book_id = books.id
       WHERE cart.user_id = $1`,
      [user_id]
    );

    if (cartItems.rows.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let total = 0;

    cartItems.rows.forEach(item => {
      total += Number(item.price) * Number(item.quantity);
    });

    const order = await pool.query(
      `INSERT INTO orders (user_id, total_amount, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, total, "Pending"]
    );

    const orderId = order.rows[0].id;

    for (const item of cartItems.rows) {
      await pool.query(
        `INSERT INTO order_items (order_id, book_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.book_id, item.quantity, item.price]
      );
    }

    await pool.query("DELETE FROM cart WHERE user_id = $1", [user_id]);

    res.json({
      message: "Order placed successfully",
      order: order.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get User Orders
router.get("/orders/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM orders
       WHERE user_id = $1
       ORDER BY order_date DESC`,
      [user_id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
// Admin Dashboard Stats
// Admin Dashboard Analytics
router.get("/admin/stats", async (req, res) => {
  try {
    const users = await pool.query("SELECT COUNT(*) FROM users");
    const books = await pool.query("SELECT COUNT(*) FROM books");
    const carts = await pool.query("SELECT COUNT(*) FROM cart");
    const orders = await pool.query("SELECT COUNT(*) FROM orders");
    const reviews = await pool.query("SELECT COUNT(*) FROM reviews");
    const wishlist = await pool.query("SELECT COUNT(*) FROM wishlist");

    const revenue = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders"
    );

    res.json({
      total_users: users.rows[0].count,
      total_books: books.rows[0].count,
      total_cart_items: carts.rows[0].count,
      total_orders: orders.rows[0].count,
      total_reviews: reviews.rows[0].count,
      total_wishlist: wishlist.rows[0].count,
      total_revenue: revenue.rows[0].total_revenue
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin - Update Order Status
router.put("/admin/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE orders
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Add Review
router.post("/reviews/add", async (req, res) => {
  try {
    const { user_id, book_id, rating, review_text } = req.body;

    const result = await pool.query(
      `INSERT INTO reviews (user_id, book_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, book_id, rating, review_text]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Reviews For One Book
router.get("/reviews/:book_id", async (req, res) => {
  try {
    const { book_id } = req.params;

    const result = await pool.query(
      `SELECT reviews.id,
              reviews.rating,
              reviews.review_text,
              reviews.created_at,
              users.full_name
       FROM reviews
       JOIN users ON reviews.user_id = users.id
       WHERE reviews.book_id = $1
       ORDER BY reviews.created_at DESC`,
      [book_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get Average Rating For One Book
router.get("/reviews/average/:book_id", async (req, res) => {
  try {
    const { book_id } = req.params;

    const result = await pool.query(
      `SELECT 
          ROUND(AVG(rating), 1) AS average_rating,
          COUNT(*) AS total_reviews
       FROM reviews
       WHERE book_id = $1`,
      [book_id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Add To Wishlist
router.post("/wishlist/add", async (req, res) => {
  try {
    const { user_id, book_id } = req.body;

    const exists = await pool.query(
      `SELECT * FROM wishlist
       WHERE user_id = $1 AND book_id = $2`,
      [user_id, book_id]
    );

    if (exists.rows.length > 0) {
      return res.json({
        message: "Book already in wishlist"
      });
    }

    const result = await pool.query(
      `INSERT INTO wishlist (user_id, book_id)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, book_id]
    );

    res.json({
      message: "Book added to wishlist",
      wishlist: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
// Get User Wishlist
router.get("/wishlist/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT wishlist.id,
              wishlist.book_id,
              books.title,
              books.author,
              books.price,
              books.image_url
       FROM wishlist
       JOIN books ON wishlist.book_id = books.id
       WHERE wishlist.user_id = $1
       ORDER BY wishlist.id DESC`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove From Wishlist
router.delete("/wishlist/remove/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM wishlist WHERE id = $1", [id]);

    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Admin - Top Selling Books
router.get("/admin/top-selling-books", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          books.id,
          books.title,
          books.author,
          books.image_url,
          SUM(order_items.quantity) AS total_sold
       FROM order_items
       JOIN books ON order_items.book_id = books.id
       GROUP BY books.id, books.title, books.author, books.image_url
       ORDER BY total_sold DESC
       LIMIT 5`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;