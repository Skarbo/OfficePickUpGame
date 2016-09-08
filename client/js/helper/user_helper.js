"use strict";

define( [
    "util/util"
], function ( Util ) {

    var UserHelper = {};

    /**
     * @param {Number} userId
     * @param {Array<UserVm>} users
     * @return {UserVm}
     */
    UserHelper.getUserFromId = function ( userId, users ) {
        if ( !userId || !users ) {
            return null;
        }

        for ( var i in users ) {
            if ( userId == users[i].id ) {
                return users[i];
            }
        }

        return null;
    };

    UserHelper.firstName = function ( name ) {
        return name ? name.match( /(.+)\s/ )[1] || "" : "";
    };

    /**
     * @param {number} userId
     * @param {Array<UserVm>} users
     * @return {Boolean} True if user
     */
    UserHelper.isUser = function ( userId, users ) {
        return UserHelper.getUserFromId( userId, users ) != null;
    };

    /**
     * @param {User} user
     * @param {Array<UserVm>} usersVms
     * @return {UserVm} Updated user
     */
    UserHelper.doUpdateUser = function ( user, usersVms ) {
        var userVmUpdated = UserHelper.getUserFromId( user.user_id, usersVms );

        if ( !userVmUpdated ) {
            return null;
        }

        userVmUpdated.doMerge( user );

        return userVmUpdated;
    };

    /**
     * @param {User} user
     * @param {Array<UserVm>} userVms
     * @returns {UserVm}
     */
    UserHelper.doInjectUser = function ( user, userVms ) {
        var userVm = UserHelper.getUserFromId( user.id, userVms );

        if ( !userVm ) {
            userVm = new UserVm( user );

            userVms.push( userVm );
        }
        else {
            userVm.doMerge( user );
        }

        return userVm;
    };

    /**
     * @param {Array<UserVm>} users
     * @returns {Array<UserGroup>}
     */
    UserHelper.getUserGroups = function ( users ) {
        var userGroupsObj = {};
        users.forEach( function ( user ) {
            user.groups().forEach( function ( userGroup ) {
                if ( !userGroupsObj[userGroup] ) {
                    userGroupsObj[userGroup] = {
                        title: userGroup,
                        count: 1
                    };
                }
                else {
                    userGroupsObj[userGroup].count++;
                }
            } );
        } );

        return Util.objectToArray( userGroupsObj );
    };

    /**
     * @param {Number} userId
     * @param {String} userName
     * @param {String} userImage
     * @returns {UserShortVm}
     */
    UserHelper.createUserShort = function ( userId, userName, userImage ) {
        return {
            id: userId,
            name: userName,
            image: userImage
        }
    };

    /**
     * @param {UserVm} userVm
     * @param {String} deviceId
     * @returns {boolean} True if User has registered device
     */
    UserHelper.doesUserHaveDevice = function ( userVm, deviceId ) {
        for ( var i = 0; i < userVm.devices.length; i++ ) {
            if ( userVm.devices.id === deviceId ) {
                return true;
            }
        }
        return false;
    };

    return UserHelper;

} );