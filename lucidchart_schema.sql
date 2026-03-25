-- MySQL-flavored Lucidchart import for the MRH capstone schema.
-- MongoDB embedded arrays are represented as TEXT for ERD import compatibility.

CREATE TABLE users (
  _id CHAR(24) PRIMARY KEY,
  firstName VARCHAR(255) NOT NULL,
  middleName VARCHAR(255) NOT NULL DEFAULT '',
  lastName VARCHAR(255) NULL,
  suffix VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  passwordSet TINYINT(1) NOT NULL DEFAULT 0,
  role ENUM('guest', 'staff', 'admin') NOT NULL DEFAULT 'guest',
  disabled TINYINT(1) NOT NULL DEFAULT 0,
  phone VARCHAR(50) NULL,
  image VARCHAR(255) NOT NULL DEFAULT '',
  tokenVersion INT NOT NULL DEFAULT 0,
  otp VARCHAR(255) NULL,
  otpExpires DATETIME NULL,
  authProvider ENUM('local', 'google') NOT NULL DEFAULT 'local',
  pendingPhone VARCHAR(255) NOT NULL DEFAULT '',
  pendingEmail VARCHAR(255) NOT NULL DEFAULT '',
  phoneVerified TINYINT(1) NOT NULL DEFAULT 0,
  emailVerified TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE buildings (
  _id CHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE roomTypes (
  _id CHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE rooms (
  _id CHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  buildingId CHAR(24) NOT NULL,
  roomTypeId CHAR(24) NOT NULL,
  capacity INT NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  amenities TEXT NOT NULL,
  images TEXT NOT NULL,
  coverImage VARCHAR(255) NOT NULL DEFAULT '',
  available TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT fk_rooms_building FOREIGN KEY (buildingId) REFERENCES buildings(_id),
  CONSTRAINT fk_rooms_room_type FOREIGN KEY (roomTypeId) REFERENCES roomTypes(_id)
);

CREATE TABLE packages (
  _id CHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  packageType VARCHAR(255) NOT NULL,
  roomTypeId CHAR(24) NULL,
  amenities TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT fk_packages_room_type FOREIGN KEY (roomTypeId) REFERENCES roomTypes(_id),
  CONSTRAINT uq_packages_name_type_room UNIQUE (name, packageType, roomTypeId)
);

CREATE TABLE bookings (
  _id CHAR(24) PRIMARY KEY,
  userId CHAR(24) NOT NULL,
  bookingName VARCHAR(255) NOT NULL,
  bookingItems TEXT NOT NULL,
  extraPackages TEXT NOT NULL,
  venueParticipants INT NOT NULL DEFAULT 0,
  checkIn DATETIME NOT NULL,
  checkOut DATETIME NOT NULL,
  totalPrice DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'approved', 'declined', 'cancelled', 'cancellation_pending') NOT NULL DEFAULT 'pending',
  paymentStatus ENUM('unpaid', 'pending', 'paid') NOT NULL DEFAULT 'unpaid',
  paymentMethod ENUM('cash', 'gcash') NULL,
  payment TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT fk_bookings_user FOREIGN KEY (userId) REFERENCES users(_id)
);

CREATE TABLE reviews (
  _id CHAR(24) PRIMARY KEY,
  userId CHAR(24) NOT NULL,
  bookingId CHAR(24) NOT NULL UNIQUE,
  rating INT NOT NULL,
  comment TEXT NOT NULL,
  images TEXT NOT NULL,
  isHidden TINYINT(1) NOT NULL DEFAULT 0,
  isEdited TINYINT(1) NOT NULL DEFAULT 0,
  reviewChat TEXT NOT NULL,
  editHistory TEXT NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT fk_reviews_user FOREIGN KEY (userId) REFERENCES users(_id),
  CONSTRAINT fk_reviews_booking FOREIGN KEY (bookingId) REFERENCES bookings(_id)
);

CREATE INDEX idx_reviews_user_created_at ON reviews (userId, createdAt);

CREATE TABLE notifications (
  _id CHAR(24) PRIMARY KEY,
  recipient CHAR(24) NOT NULL,
  type ENUM('new_review', 'new_reply', 'review_hidden', 'booking_update', 'payment_update', 'account_status') NOT NULL,
  message TEXT NOT NULL,
  sender CHAR(24) NULL,
  link VARCHAR(255) NULL,
  isRead TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient) REFERENCES users(_id),
  CONSTRAINT fk_notifications_sender FOREIGN KEY (sender) REFERENCES users(_id)
);

CREATE TABLE reports (
  _id CHAR(24) PRIMARY KEY,
  reportType ENUM('monthly', 'annual') NOT NULL,
  label VARCHAR(255) NOT NULL,
  periodMonth INT NULL,
  periodYear INT NOT NULL,
  periodStart DATETIME NOT NULL,
  periodEnd DATETIME NOT NULL,
  bookingIds TEXT NOT NULL,
  totalBookings INT NOT NULL DEFAULT 0,
  totalParticipants INT NOT NULL DEFAULT 0,
  totalRoomsBooked INT NOT NULL DEFAULT 0,
  totalIncome DECIMAL(12,2) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT uq_reports_type_year_month UNIQUE (reportType, periodYear, periodMonth)
);
