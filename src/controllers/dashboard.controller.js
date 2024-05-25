const Video = require('../models/video');
const Comment = require('../models/comment');
const Playlist = require('../models/playlist');

// Import necessary modules

// Define the super admin controller
const superAdminController = {
    // Delete a video by its ID
    deleteVideo: async (req, res) => {
        try {
            const videoId = req.params.videoId;
            // Check if the user is the super admin
            if (req.user.username === 'superadmin' && req.user.password === 'superadminpassword') {
                // Delete the video
                await Video.findByIdAndDelete(videoId);
                res.status(200).json({ message: 'Video deleted successfully' });
            } else {
                res.status(403).json({ message: 'Access denied' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Delete a comment by its ID
    deleteComment: async (req, res) => {
        try {
            const commentId = req.params.commentId;
            // Check if the user is the super admin
            if (req.user.username === 'superadmin' && req.user.password === 'superadminpassword') {
                // Delete the comment
                await Comment.findByIdAndDelete(commentId);
                res.status(200).json({ message: 'Comment deleted successfully' });
            } else {
                res.status(403).json({ message: 'Access denied' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Delete a playlist by its ID
    deletePlaylist: async (req, res) => {
        try {
            const playlistId = req.params.playlistId;
            // Check if the user is the super admin
            if (req.user.username === 'superadmin' && req.user.password === 'superadminpassword') {
                // Delete the playlist
                await Playlist.findByIdAndDelete(playlistId);
                res.status(200).json({ message: 'Playlist deleted successfully' });
            } else {
                res.status(403).json({ message: 'Access denied' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = superAdminController;