import React from 'react';
import Avatar from 'react-avatar';

const formatCursorLabel = (cursorPosition, selectionRange) => {
    if (!cursorPosition) {
        return 'cursor —';
    }

    const line = Number(cursorPosition?.line || 0) + 1;
    const column = Number(cursorPosition?.ch || 0) + 1;

    if (!selectionRange || !selectionRange.anchor || !selectionRange.head) {
        return `L${line}:C${column}`;
    }

    const hasSelection =
        selectionRange.anchor.line !== selectionRange.head.line ||
        selectionRange.anchor.ch !== selectionRange.head.ch;

    return hasSelection ? `L${line}:C${column} · selecting` : `L${line}:C${column}`;
};

const Client = ({
    username,
    color = '#8B5CF6',
    isTyping = false,
    isOwner = false,
    cursorPosition = null,
    selectionRange = null,
    voiceEnabled = false,
}) => {
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
                    {voiceEnabled ? <span className="presenceTypingText">voice on</span> : null}
                    {isOwner ? <span className="presenceTypingText">creator</span> : null}
                </span>
                <span className="presenceCursorChip">
                    <span className="presenceCursorSwatch" style={{background: color}} />
                    {formatCursorLabel(cursorPosition, selectionRange)}
                </span>
            </div>
        </div>
    );
};

export default Client;