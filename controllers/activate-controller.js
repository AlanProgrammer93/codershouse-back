const Jimp = require('jimp');
const path = require('path');
const userService = require('../services/user-service');
const UserDto = require('../dtos/user-dto');

class ActivateController {
    async activate (req, res) {
        const {name, avatar} = req.body;
        console.log(name, avatar);
        if (!name || !avatar) {
            res.status(400).json({message: 'Todos los campos son requeridos.'});
        }

        const buffer = Buffer.from(avatar.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''), 'base64');

        const imagePath = `${Date.now()}-${Math.round(
            Math.random() * 1e9
        )}.png`;

        try {
            console.log("dentro del try");
            const jimResp = await Jimp.read(buffer);
            console.log("despuie de await Jimp");
            jimResp
                .resize(150, Jimp.AUTO)
                .write(path.resolve(__dirname, `../storage/${imagePath}`));
            console.log("despuie redimencionar con jimp");
            } catch (error) {
            res.status(500).json({ message: 'No se pudo procesar la imagen' });
        }

        const userId = req.user._id

        try {
            console.log("dentro del try await userService");
            const user = await userService.findUser({_id: userId});
            console.log("despuesr de await userService");
            if (!user) {
                res.status(404).json({message: 'Usuario no encontrado'});
            }
            user.activated = true;
            user.name = name;
            user.avatar = `/storage/${imagePath}`;
            user.save();

            res.json({user: new UserDto(user), auth: true});
        } catch (error) {
            res.status(500).json({ message: 'No se pudo completar el registro' });
        }
    }
}

module.exports = new ActivateController();