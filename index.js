const express = require('express');
const mysql = require('mysql');


const app = express();

const portNumber = 8080;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.set("views", "views");

//connect with database
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'HotelMangement'
})

con.connect((err) => {
    if (err) throw err;
    console.log("Database is connected");
})


app.get("/db", (req, res) => {
    const q = "select count(*) as count from hotel";
    con.query(q, (err, results) => {
        if (err) throw err;
        const count = results[0].count;
        console.log("Number of Hotels: " + results[0].count);
        //res.send("Number of Hotels: " + results[0].count);
        res.render("home", { count: count });
    })
});



app.post("/register", (req, res) => {
    const hotelName = req.body.hotelName;
    const streetName = req.body.streetName;
    const zipCode = req.body.zipCode;
    const state = req.body.state;
    const country = req.body.country;
    const emailAddress = req.body.emailAddress;
    const description = req.body.description;
    const contactInformation = req.body.contactInformation;

    const hotelInfo = {
        HotelName: hotelName,
        StreetName: streetName,
        ZipCode: zipCode,
        State: state,
        Country: country,
        EmailAddress: emailAddress,
        Description: description,
        ContactInformation: contactInformation
    };

    const query = "INSERT INTO hotel SET ?";
    con.query(query, hotelInfo, (err, result) => {
        if (err) throw err;
        res.redirect("/db");
    });
});





app.get("/display", (req, res) => {
    const q = "select * from hotel";
    con.query(q, (err, result) => {
        if (err) throw err;
        //console.log(result);
        //res.send(result);
        res.render("showAll", { data: result });
    })
})


app.get("/search", (req, res) => {
    res.render("search");
})

app.post("/search", (req, res) => {
    const id = req.body.id;
    const q = "select * from hotel where HotelID=? ";

    con.query(q, [id], (err, result) => {
        if (err) throw err;
        // if (result.length == 0) {
        //     res.send("No such student found");
        else {
            res.render("searchResult", { data: result[0], count: result.length });
        }
    })
})

app.get("/", (req, res) => {
    res.send("The response is coming from express web server");
})

app.get("/hello", (req, res) => {
    console.log("The entered student name is: " + req.query.name);
    res.send("The entered student name is: " + req.query.name);
})

app.post("/hello", (req, res) => {
    console.log("The entered student name is: " + req.body.name);
    res.send("The entered student name is: " + req.body.name);
})

app.get("/test", (req, res) => {
    res.send("This is another test route");
})

app.listen(portNumber, () => {
    console.log("Server is listening at portNumber: " + portNumber);
})