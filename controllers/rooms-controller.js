const RoomDto = require("../dtos/room.dto");
const roomService = require("../services/room-services");

class RoomsController {
    async create(req, res) {
        const {topic, roomType} = req.body;

        if (!topic || !roomType) {
            return res.status(400).json({message: 'Todos los campos son requeridos!'});
        }

        const room = await roomService.create({
            topic,
            roomType,
            ownerId: req.user._id
        });

        return res.json(new RoomDto(room));
    }

    async index(req, res) {
        const rooms = await roomService.getAllRoooms(['open']);
        const allRooms = rooms.map(room => new RoomDto(room));
        return res.json(allRooms);
    }

    async show(req, res) {
        const room = await roomService.getRooom(req.params.roomId);
        return res.json(room);
    }
}

module.exports = new RoomsController();