

const jwt = require('jsonwebtoken');

const payload = {
    employeeId: 2,
    role: 'employee',
};

const secret = 'mySecretKey123912738aopsgjnspkmndfsopkvajoirjg94gf2opfng2moknm'; // use your real secret

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log(token);
