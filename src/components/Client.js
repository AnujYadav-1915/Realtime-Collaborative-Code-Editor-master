import React from 'react';
import Avatar from 'react-avatar';

const Client = ({username, color = '#8B5CF6', isTyping = false, isOwner = false}) => {
    return (
        <div className="client">
            <div className="avatarWrap">
                <Avatar name={username} size={46} round="12px" color={color} fgColor="#FFFFFF" />
                <span className="onlineIndicator" aria-hidden="true" />
            </div>
            <div className="presenceMeta">
                <span className="userName">{username}</span>
                <span className="presenceStatusLine">
                    <span className="presenceOnlineText">● Online</span>
                    {isTyping ? <span className="presenceTypingText">typing...</span> : null}
                    {isOwner ? <span className="presenceTypingText">creator</span> : null}
                </span>
                <span className="presenceCursorChip">
                    <span className="presenceCursorSwatch" style={{background: color}} />
                    cursor
                </span>
            </div>
        </div>
    );
};

export default Client;