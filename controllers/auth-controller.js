const hashService = require("../services/hash-service");
const otpService = require("../services/otp-service");
const userService = require('../services/user-service');
const tokenService = require('../services/token-service');
const UserDto = require("../dtos/user-dto");

class AuthController {
    async sendOtp(req, res) {
        const { phone } = req.body;
        
        if (!phone) {
            res.status(400).json({message: 'El numero de telefono es nesesario'})
        }

        const otp = await otpService.generateOtp();
/* +917567567857 */
        console.log(otp);
        const ttl = 1000 * 60 * 2;
        const expires = Date.now() + ttl;
        const data = `${phone}.${otp}.${expires}`;
        const hash = hashService.hashOtp(data);
        
        // enviar OTP
        try {
            await otpService.sendBySms(phone, otp);
            res.json({
                hash: `${hash}.${expires}`,
                phone,
                otp
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({message: 'Falló el envio de mensaje'});
        }
    }

    async verifyOtp(req, res) {
        const { otp, hash, phone } = req.body;
        if (!otp || !hash || !phone) {
            res.status(400).json({message: 'Todos los campos son requeridos!'})
        }

        const [hashedOtp, expires] = hash.split('.');
        if (Date.now() > expires) {
            res.status(400).json({message: 'OTP expirado'});
        }

        const data = `${phone}.${otp}.${expires}`;
        const isValid = otpService.verifyOtp(hashedOtp, data);

        if (!isValid) {
            res.status(400).json({message: 'OTP invalido'});
        }

        let user;
        
        try {
            user = await userService.findUser({phone});
            if (!user) {
               user = await userService.createUser({phone});
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({message: 'DB ERROR'})
        }

        const {accessToken, refreshToken} = tokenService.generateTokens({
            _id: user._id,
            activated: false
        });

        await tokenService.storeRefreshToken(refreshToken, user._id);
        
        res.cookie('refreshtoken', refreshToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true
        });

        res.cookie('accesstoken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true
        });

        const userDto = new UserDto(user);
        res.json({user: userDto, auth: true});
    }

    async refresh(req, res) {
        const {refreshToken: refreshTokenFromCookie} = req.cookies;
        
        let userData;
        try {
            userData = await tokenService.verifyRefreshToken(refreshTokenFromCookie);

        } catch (error) {
            return res.status(401).json({message: 'Token Invalido'});
        }

        try {
            const token = await tokenService.findRefreshToken(
                userData._id, 
                refreshTokenFromCookie
            );
            if (!token) {
                return res.status(401).json({message: 'Token Invalido'});
            }
            
        } catch (error) {
            return res.status(500).json({message: 'Error Interno'});
        }

        const user = await userService.findUser({_id: userData._id});
        if (!user) {
            return res.status(404).json({message: 'Usuario no encontrado'});
        }

        const {refreshToken, accessToken} = tokenService.generateTokens({_id: userData._id});
        
        try {
            await tokenService.updateRefreshToken(userData._id, refreshToken)
        } catch (error) {
            return res.status(500).json({message: 'Error Interno'});
        }

        res.cookie('refreshtoken', refreshToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true
        });

        res.cookie('accesstoken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true
        });

        const userDto = new UserDto(user);
        res.json({user: userDto, auth: true});
    }

    async logout(req, res) {
        const {refreshToken} = req.cookies;
        await tokenService.removeToken(refreshToken);

        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        res.json({user: null, auth: false});
    }
}


module.exports = new AuthController();