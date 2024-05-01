const express = require('express');
const mysql = require('mysql');
const path = require('path');

const app = express();
const portNumber = 8080;

// Database connection
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'db_hotel'
});

con.connect((err) => {
    if (err) {
        console.error("Error connecting to database: " + err.stack);
        process.exit(1);
    }
    console.log("Database is connected");
});

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Perform your login logic here
    if (username === 'admin' && password === 'admin') {
        // Redirect to the main page after successful login
        res.redirect('login.html');
    } else {
        // Redirect back to the login page if login fails
        res.redirect('/');
    }
});

app.post('/managerlogin', (req, res) => {
    const { username, password } = req.body;

    // Perform your login logic here
    if (username === 'adminmanager' && password === 'adminmanager') {
        // Redirect to the main page after successful login
        res.redirect('managerlogin.html');
    } else {
        // Redirect back to the login page if login fails
        res.redirect('/');
    }
});

// Route to render the home page
app.get('/', (req, res) => {
    res.render('home');
});

// Route to render the guest information form
app.get('/guest', (req, res) => {
    res.render('guest_form');
});

// Route to handle guest submission
app.post('/guest', (req, res) => {
    const { firstName, lastName, contactInfo, email, roomNumber, serviceID } = req.body;
    const guestData = {
        FirstName: firstName,
        LastName: lastName,
        Contact_Information: contactInfo,
        Email_Address: email
    };
    const query = 'INSERT INTO Guest SET ?';
    con.query(query, guestData, (err, result) => {
        if (err) {
            console.error('Error inserting guest into database: ' + err.stack);
            return res.status(500).send('Error inserting guest');
        }
        console.log('Guest inserted into database with ID: ' + result.insertId);
        // Redirect to the booking form after successful guest insertion
        res.redirect('/booking');
    });
});


// Route to handle AJAX request for fetching room numbers based on the selected hotel
app.get('/rooms', (req, res) => {
    const hotelID = req.query.hotelID;
    
    // Query the database to fetch the room numbers based on hotelID
    const query = 'SELECT RoomNumber FROM Room WHERE HotelID = ?';
    con.query(query, [hotelID], (err, results) => {
        if (err) {
            console.error('Error fetching room numbers from the database:', err);
            return res.status(500).json({ error: 'Error fetching room numbers' });
        }

        const roomNumbers = results.map(row => row.RoomNumber);
        res.json({ roomNumbers });
    });
});

// Route to handle booking submission
app.get('/booking', (req, res) => {
    // Fetch all hotels from the database
    const query = 'SELECT * FROM Hotel';
    con.query(query, (err, hotels) => {
        if (err) {
            console.error('Error fetching hotels from the database:', err);
            return res.status(500).send('Error fetching hotels');
        }

        // Fetch all rooms from the database
        const roomQuery = 'SELECT RoomNumber FROM Room';
        con.query(roomQuery, (err, rooms) => {
            if (err) {
                console.error('Error fetching room numbers from the database:', err);
                return res.status(500).send('Error fetching room numbers');
            }

            // Render the booking form with fetched data
            res.render('booking_form', { hotels: hotels, rooms: rooms });
        });
    });
});

// Route to handle booking submission
app.post('/booking', (req, res) => {
    const { checkInDate, checkOutDate, paymentType, stayDuration, hotelID, roomNumber, guestID } = req.body;

    // Query the database to fetch the price of the selected room
    const priceQuery = 'SELECT Price FROM Room WHERE HotelID = ? AND RoomNumber = ?';
    con.query(priceQuery, [hotelID, roomNumber], (priceErr, priceResults) => {
        if (priceErr) {
            console.error('Error fetching room price from the database:', priceErr);
            return res.status(500).send('Error fetching room price');
        }

        if (priceResults.length === 0) {
            return res.status(404).json({ error: 'Room price not found' });
        }

        // Calculate the total price based on the room price and stay duration
        const roomPrice = priceResults[0].Price;
        const totalPrice = roomPrice * stayDuration;

        // Construct the booking data
        const bookingData = {
            GuestID: guestID,
            HotelID: hotelID,
            RoomNumber: roomNumber,
            CheckInDate: checkInDate,
            CheckOutDate: checkOutDate,
            TotalPrice: totalPrice, // Update total price here
            Payment_Type: paymentType,
            Stay_Duration: stayDuration
        };

        // Insert the booking data into the database
        const query = 'INSERT INTO Booking SET ?';
        con.query(query, bookingData, (bookingErr, result) => {
            if (bookingErr) {
                console.error('Error inserting booking into database:', bookingErr);
                return res.status(500).send('Error inserting booking');
            }
            console.log('Booking inserted into database with ID: ' + result.insertId);
            // Render the booking confirmation page with the total price

            // Fetch all hotels from the database again
            const hotelQuery = 'SELECT * FROM Hotel';
            con.query(hotelQuery, (err, hotels) => {
                if (err) {
                    console.error('Error fetching hotels from the database:', err);
                    return res.status(500).send('Error fetching hotels');
                }

                // Render the booking form with fetched data
                res.render('booking_form', { hotels: hotels, totalPrice: totalPrice });
            });
        });
    });
});


// Route to handle AJAX request for fetching total price
app.get('/totalPrice', (req, res) => {
    const { hotelID, roomNumber } = req.query;

    // Query the database to fetch the total price based on hotelID and roomNumber
    const query = `
        SELECT Room.Price AS TotalPrice
        FROM Room
        WHERE Room.HotelID = ? AND Room.RoomNumber = ?
    `;
    con.query(query, [hotelID, roomNumber], (err, results) => {
        if (err) {
            console.error('Error fetching total price from the database:', err);
            return res.status(500).json({ error: 'Error fetching total price' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Total price not found' });
        }

        // Send the total price back to the client
        res.json({ totalPrice: results[0].TotalPrice });
    });
});

// Route to render the page showing all hotels and room numbers
app.get('/showAll', (req, res) => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const query = `
        SELECT Hotel.*, Room.RoomNumber, Booking.CheckInDate, Booking.CheckOutDate
        FROM Hotel
        LEFT JOIN Room ON Hotel.HotelID = Room.HotelID
        LEFT JOIN Booking ON Room.RoomNumber = Booking.RoomNumber
        AND (
            (CURDATE() BETWEEN Booking.CheckInDate AND Booking.CheckOutDate) OR
            (Booking.CheckInDate <= '${today}' AND Booking.CheckOutDate > '${today}')
        )
    `;
    con.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data from the database: ' + err.stack);
            return res.status(500).send('Error fetching data');
        }

        const hotels = [];
        results.forEach(result => {
            let hotel = hotels.find(h => h.HotelID === result.HotelID);
            if (!hotel) {
                hotel = { ...result, rooms: [] };
                hotels.push(hotel);
            }
            if (result.CheckInDate && result.CheckOutDate) {
                hotel.rooms.push({ ...result, Availability: false });
            } else {
                hotel.rooms.push({ ...result, Availability: true });
            }
        });

        res.render('showAll', { hotels });
    });
});

// Route to render the search form
app.get('/search', (req, res) => {
    res.render('search');
});

// Route to handle search submission
app.post('/search', (req, res) => {
    const { city, state } = req.body;

    const query = `
        SELECT Hotel.HotelName, Hotel.StreetName, Hotel.City, Hotel.ZipCode, Hotel.State, Hotel.Country, Hotel.EmailAddress, Hotel.Description, Hotel.ContactInformation,
               Service.Name AS ServiceName, Service.Description AS ServiceDescription, Service.Price AS ServicePrice,
               Room.Type AS RoomType, Room.Description AS RoomDescription, Room.Capacity, Room.Price AS RoomPrice, Room.RoomNumber
        FROM Hotel
        LEFT JOIN Room ON Hotel.HotelID = Room.HotelID
        LEFT JOIN Service ON Hotel.HotelID = Service.HotelID
        WHERE Hotel.City = ? AND Hotel.State = ?
    `;
    con.query(query, [city, state], (err, results) => {
        if (err) {
            console.error('Error searching for hotels: ' + err.stack);
            return res.status(500).send('Error searching for hotels');
        }
        // Pass the searched city and state to the template
        res.render('search_results', { city: city, state: state, hotels: results });
    });
});

// Route to render the page showing all hotels, employees, and departments
app.get('/eshowAll', (req, res) => {
    // Fetch data from the database
    const query = `
        SELECT Hotel.HotelName, Employee.FirstName, Employee.LastName, Employee.Position, 
               Employee.ContactInformation, Employee.EmailAddress, Employee.EmployeeSalary, 
               Department.DepartmentName, Department.Description
        FROM Employee
        INNER JOIN Works_In ON Employee.EmployeeID = Works_In.EmployeeID
        INNER JOIN Department ON Works_In.DepartmentName = Department.DepartmentName
        INNER JOIN Hotel ON Works_In.HotelID = Hotel.HotelID
    `;
    con.query(query, (err, employees) => {
        if (err) {
            console.error('Error fetching data from the database: ' + err.stack);
            return res.status(500).send('Error fetching data');
        }

        // Render the eshowAll page with fetched data
        res.render('eshowAll', { employees: employees });
    });
});

// index.js

// Route to render the form to add a new hotel
app.get('/addHotel', (req, res) => {
    res.render('addHotel');
});

// Route to handle the form submission for adding a new hotel
app.post('/addHotel', (req, res) => {
    const { hotelName, streetName, city, zipCode, state, country, emailAddress, description, contactInformation } = req.body;
    const hotelData = {
        HotelName: hotelName,
        StreetName: streetName,
        City: city,
        ZipCode: zipCode,
        State: state,
        Country: country,
        EmailAddress: emailAddress,
        Description: description,
        ContactInformation: contactInformation
    };

    // Insert the hotel data into the database
    const query = 'INSERT INTO Hotel SET ?';
    con.query(query, hotelData, (err, result) => {
        if (err) {
            console.error('Error inserting hotel into database:', err);
            return res.status(500).send('Error adding hotel');
        }
        console.log('Hotel added into database with ID:', result.insertId);
        res.render('addHotel', { success: true });
    });
});

/// Route to render the employee details page
app.get('/employeeDetails', (req, res) => {
    // Fetch all employees and their departments from the database
    const query = `
        SELECT Employee.EmployeeID, Employee.FirstName, Employee.LastName, Employee.Position, Employee.ContactInformation, 
               Employee.EmailAddress, Employee.EmployeeSalary, works_in.DepartmentName, Department.Description
        FROM Employee
        INNER JOIN works_in ON Employee.EmployeeID = works_in.EmployeeID
        INNER JOIN Department ON works_in.DepartmentName = Department.DepartmentName
    `;
    con.query(query, (err, employees) => {
        if (err) {
            console.error('Error fetching employee details:', err);
            return res.status(500).send('Error fetching employee details');
        }

        // Render the employee details page with fetched data
        res.render('employeeDetails', { employees });
    });
});

// Route to handle form submission for updating employee details
app.post('/updateEmployee', (req, res) => {
    const { action } = req.body;
    
    if (action === 'updateDepartment') {
        const { employeeID, newDepartment } = req.body;

        // Check if the new department exists in the Department table
        const departmentQuery = 'SELECT * FROM Department WHERE DepartmentName = ?';
        con.query(departmentQuery, [newDepartment], (deptErr, deptResult) => {
            if (deptErr) {
                console.error('Error checking department:', deptErr);
                return res.status(500).send('Error updating employee department');
            }

            if (deptResult.length === 0) {
                // Department does not exist, handle this case
                console.error('Department does not exist');
                return res.status(400).send('Department does not exist');
            }

            // Department exists, proceed with the update
            const updateQuery = 'UPDATE works_in SET DepartmentName = ? WHERE EmployeeID = ?';
            con.query(updateQuery, [newDepartment, employeeID], (err, result) => {
                if (err) {
                    console.error('Error updating employee department:', err);
                    return res.status(500).send('Error updating employee department');
                }
                console.log('Employee department updated successfully');
                res.redirect('/employeeDetails');
            });
        });
    } else if (action === 'updateSalary') {
        const { employeeID, newSalary } = req.body;

        // Update the employee's salary in the database
        const updateQuery = 'UPDATE Employee SET EmployeeSalary = ? WHERE EmployeeID = ?';
        con.query(updateQuery, [newSalary, employeeID], (err, result) => {
            if (err) {
                console.error('Error updating employee salary:', err);
                return res.status(500).send('Error updating employee salary');
            }
            console.log('Employee salary updated successfully');
            res.redirect('/employeeDetails');
        });
    } else {
        res.status(400).send('Invalid action');
    }
});

// Route to render the form to delete a hotel
app.get('/deleteHotel', (req, res) => {
    // Fetch all hotels from the database
    const query = 'SELECT HotelName FROM Hotel';
    con.query(query, (err, hotels) => {
        if (err) {
            console.error('Error fetching hotels from the database:', err);
            return res.status(500).send('Error fetching hotels');
        }
        // Render the deleteHotel form with fetched hotel names
        res.render('deleteHotel', { hotels: hotels });
    });
});

// Route to handle the form submission for deleting a hotel
app.post('/deleteHotel', (req, res) => {
    const hotelName = req.body.hotelName;

    // Delete the hotel from the database
    const deleteQuery = 'DELETE FROM Hotel WHERE HotelName = ?';
    con.query(deleteQuery, [hotelName], (err, result) => {
        if (err) {
            console.error('Error deleting hotel from database:', err);
            return res.status(500).send('Error deleting hotel');
        }
        console.log('Hotel deleted from database:', hotelName);
        res.redirect('http://localhost:8080/managerlogin.html'); // Redirect to home page after deletion
    });
});

// Start the server
app.listen(portNumber, () => {
    console.log(`Server is running on http://localhost:${portNumber}`);
});
