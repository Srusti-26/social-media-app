# E-Commerce Store - Modern Django Web Application

**Author:** Srusti  
**Version:** 1.0.0  
**License:** Proprietary (Personal Use Only)

A feature-rich, modern e-commerce platform built with Django and Bootstrap 5.   Complete shopping experience with product listings, cart functionality, user authentication, and order processing.

## 🎥 Demo Video

**📹 Watch the complete demo:** [DEMO.mp4](./media/project_demo/DEMO.mp4)

## 🎬 Demo GIF

![Demo GIF](./media/project_demo/DEMO.gif)

*Quick preview of the application in action*

> **📺 For complete functionality demonstration including sorting, search, and cart operations, watch the demo video above!**

## 📸 Screenshots

<details>
<summary><strong>🏠 Homepage - Product Listings</strong></summary>

![Homepage](./media/Screenshots/Home.jpeg)

*Modern product grid with search, filtering, and sorting capabilities*
</details>

<details>
<summary><strong>📱 Product Details</strong></summary>

![Product Details](./media/Screenshots/Product_detail.jpeg)

*Detailed product view with add to cart functionality*
</details>

<details>
<summary><strong>🛒 Shopping Cart</strong></summary>

![Shopping Cart](./media/Screenshots/Cart.jpeg)

*Interactive shopping cart with quantity controls*
</details>

<details>
<summary><strong>🔍 Search Functionality</strong></summary>

![Search](./media/Screenshots/Search.jpeg)

*Real-time product search with instant results*
</details>

<details>
<summary><strong>🔐 User Authentication</strong></summary>

**Login Page:**
![Login](./media/Screenshots/Login.jpeg)

**Registration Page:**
![Register](./media/Screenshots/Register.jpeg)

*Secure user authentication with Django Allauth*
</details>

<details>
<summary><strong>ℹ️ About Page</strong></summary>

![About](./media/Screenshots/About.jpeg)

*Professional about page with company information*
</details>

<details>
<summary><strong>📞 Contact Page</strong></summary>

![Contact](./media/Screenshots/Contact.jpeg)

*Contact form with modern design*
</details>

## Features

### Core E-Commerce Functionality
- **Product Management** - Complete product catalog with categories, images, and detailed descriptions
- **Shopping Cart** - Session-based cart for anonymous users, persistent cart for authenticated users
- **User Authentication** - Secure registration, login, logout with Django Allauth
- **Order Processing** - Complete checkout flow with order history
- **Search & Filter** - Product search and category-based filtering
- **Product Sorting** - Sort by price (low to high, high to low), newest, and name

### Advanced Features
- **Responsive Design** - Mobile-first Bootstrap 5 implementation
- **Image Handling** - Product images with fallback gradients
- **AJAX Cart Operations** - Real-time cart updates without page refresh
- **User Profiles** - Profile management and order history
- **Admin Interface** - Django admin for product and order management
- **Modern UI/UX** - Glassmorphism effects, animations, and smooth transitions

### Security & Performance
- **CSRF Protection** - Django's built-in CSRF protection
- **User Authentication** - Secure password handling with Django's auth system
- **Input Validation** - Server-side validation for all forms
- **Media Security** - Proper media file handling and serving
- **Session Management** - Secure session handling for cart operations

## Technology Stack

### Backend
- **Django 4.x** - Python web framework
- **Python 3.x** - Programming language
- **SQLite** - Database (easily configurable to PostgreSQL/MySQL)
- **Django Allauth** - Authentication system
- **Pillow** - Image processing
- **Django Crispy Forms** - Form rendering

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with animations and gradients
- **Bootstrap 5** - Responsive CSS framework
- **JavaScript (ES6+)** - Interactive functionality
- **Font Awesome** - Icon library
- **AJAX** - Asynchronous operations

### Development Tools
- **Django Debug Toolbar** - Development debugging
- **Django Extensions** - Additional management commands
- **Git** - Version control
- **Virtual Environment** - Python dependency isolation

## Project Structure

```
E_commerce_store/
├── ecommerce_project/
│   ├── settings.py         # Django configuration
│   ├── urls.py            # Main URL configuration
│   ├── wsgi.py            # WSGI configuration
│   └── asgi.py            # ASGI configuration
├── store/
│   ├── models.py          # Product, Cart, Order models
│   ├── views.py           # Business logic and view functions
│   ├── urls.py            # Store URL patterns
│   ├── forms.py           # Django forms
│   ├── admin.py           # Admin interface configuration
│   ├── management/
│   │   └── commands/
│   │       └── populate_data.py  # Sample data population
│   └── templates/store/   # Store-specific templates
├── users/
│   ├── models.py          # User profile models
│   ├── views.py           # User-related views
│   ├── urls.py            # User URL patterns
│   └── templates/users/   # User-specific templates
├── templates/
│   ├── base.html          # Base template with navigation
│   ├── store/             # Store templates
│   └── account/           # Authentication templates
├── static/
│   ├── css/               # Custom stylesheets
│   ├── js/                # JavaScript files
│   └── images/            # Static images
├── media/
│   ├── products/          # Uploaded product images
│   ├── project_demo/      # Demo video and GIF
│   │   ├── DEMO.mp4      # Project demonstration video
│   │   └── DEMO.gif      # Project demonstration GIF
│   └── Screenshots/       # Project screenshots
├── requirements.txt       # Python dependencies
├── manage.py             # Django management script
├── .gitignore            # Git ignore file
├── LICENSE               # License file
└── README.md             # This file
```

## Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/E_commerce_store.git
   cd E_commerce_store
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Database setup**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

6. **Populate sample data**
   ```bash
   python manage.py populate_data
   ```

7. **Run development server**
   ```bash
   python manage.py runserver
   ```

8. **Access the application**
   - Open browser and go to `http://127.0.0.1:8000/`
   - Admin interface: `http://127.0.0.1:8000/admin/`

## Usage Guide

### For Customers

#### Browsing Products
- View all products on the homepage
- Use category filters to narrow down products
- Search for specific products using the search bar
- Sort products by price, name, or newest additions

#### Shopping Cart
- Add products to cart from product listings
- View cart contents in the navigation
- Update quantities or remove items
- Proceed to checkout when ready

#### User Account
- Register for a new account or login
- View order history in profile
- Update profile information
- Logout securely

#### Checkout Process
1. Add items to cart
2. Click "Checkout" button
3. Fill in shipping and billing information
4. Review order details
5. Complete purchase

### For Administrators

#### Product Management
- Access Django admin at `/admin/`
- Add new products with images and descriptions
- Organize products into categories
- Update pricing and inventory

#### Order Management
- View all customer orders
- Update order status
- Generate reports
- Manage customer accounts

## Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (for production)
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db

# Email Settings (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True

# Media and Static Files
MEDIA_ROOT=/path/to/media/files
STATIC_ROOT=/path/to/static/files
```

### Database Configuration
The project uses SQLite by default. For production, configure PostgreSQL:

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'ecommerce_db',
        'USER': 'your_username',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

## Customization

### Adding New Features
1. **New Models**: Add to `store/models.py`
2. **New Views**: Add to `store/views.py`
3. **New Templates**: Create in `templates/store/`
4. **New URLs**: Add to `store/urls.py`

### Styling Customization
- Modify `static/css/custom.css` for custom styles
- Update Bootstrap variables for theme changes
- Add new animations and effects

### Payment Integration
The project is ready for payment gateway integration:
- Stripe integration points in checkout views
- PayPal integration ready
- Custom payment processor support

## Deployment

### Production Checklist
- [ ] Set `DEBUG = False`
- [ ] Configure production database
- [ ] Set up static file serving
- [ ] Configure media file serving
- [ ] Set up SSL certificate
- [ ] Configure email backend
- [ ] Set up monitoring and logging

### Deployment Options
- **Heroku**: Easy deployment with Heroku Postgres
- **DigitalOcean**: App Platform or Droplet deployment
- **AWS**: EC2 with RDS database
- **PythonAnywhere**: Simple Django hosting

## Security Features

- **CSRF Protection**: All forms protected against CSRF attacks
- **SQL Injection Prevention**: Django ORM prevents SQL injection
- **XSS Protection**: Template auto-escaping enabled
- **Secure Authentication**: Django's built-in authentication system
- **Session Security**: Secure session configuration
- **Input Validation**: Server-side validation for all inputs

## Performance Optimizations

- **Database Optimization**: Efficient queries with select_related
- **Static File Compression**: Gzip compression enabled
- **Image Optimization**: Pillow for image processing
- **Caching**: Django caching framework ready
- **CDN Ready**: Static files ready for CDN deployment

## Testing

Run the test suite:
```bash
python manage.py test
```

### Test Coverage
- Model tests for all business logic
- View tests for all endpoints
- Form validation tests
- Integration tests for user workflows

## License

**IMPORTANT: This project is under a Proprietary License**

- **Personal Use**: Allowed for learning and personal projects
- **Commercial Use**: Not permitted without explicit written permission
- **Distribution**: Cannot distribute, sell, or sublicense without permission
- **Modification**: Personal modifications allowed, commercial modifications require permission

**For commercial licensing or permissions, contact:** 1nt23ad052.srusti@nmit.ac.in

See the [LICENSE](LICENSE) file for complete terms and conditions.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## Troubleshooting

### Common Issues

**Static files not loading**
```bash
python manage.py collectstatic
```

**Database migration errors**
```bash
python manage.py makemigrations --empty store
python manage.py migrate
```

**Permission denied errors**
```bash
# Check file permissions
chmod +x manage.py
```

**Import errors**
```bash
# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

## Support

For support and questions:
- **Email**: 1nt23ad052.srusti@nmit.ac.in
- **Issues**: Create an issue on GitHub
- **Documentation**: Check Django documentation for framework-specific questions

## Roadmap

### Upcoming Features
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Advanced search with filters
- [ ] Email notifications
- [ ] Inventory management
- [ ] Multi-vendor support
- [ ] Mobile app API
- [ ] Analytics dashboard

## Author

**Srusti**
- GitHub: [@Srusti-26](https://github.com/Srusti-26)
- Email: 1nt23ad052.srusti@nmit.ac.in
- Institution: NMIT, Bangalore

## Acknowledgments

- Django Software Foundation for the amazing framework
- Bootstrap team for the responsive CSS framework
- Font Awesome for the icon library
- Python community for excellent packages

---

**⭐ Star this repository if you found it helpful!**

*Built with ❤️ by Srusti using Django and Bootstrap*
