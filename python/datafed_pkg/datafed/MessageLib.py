## @package MessageLib
# Provides a low-level client interface to the DataFed server
# 
# The DataFed MessageLib module contains a single API class that provides
# a low-level client interface for creating, sending, and receiving
# messages over a connection with a DataFed server. The DataFed message
# interface uses Google's protobuf package, and the messages (requests,
# replies, and data structures) are defined in the \*.proto files included
# in the DataFed client package. This module relies on the DataFed
# Connection module which sends and receives encoded messages over a
# secure ZeroMQ link.


import os
import zmq
from . import Version_pb2
from . import SDMS_Anon_pb2 as anon
from . import SDMS_Auth_pb2 as auth
from . import Connection

##
# @class API
# @brief Provides a low-level messaging interface to the DataFed core server.
#
# The DataFed MessageLib.API class provides a low-level interface
# for creating, sending, and receiving messages to/from a DataFed
# server. The DataFed message interface uses Google's protobuf
# package, and the messages (requests, replies, and data structures)
# are defined in the \*.proto files included in the DataFed client
# package. Basic functionality includes connectivity, authentication,
# and both synchronous ans asynchronous message send/recv methods.
#
class API:

    ##
    # @brief MessageLib.API class initialization method.
    # @param server_host The DataFed core server hostname or IP address.
    # @param server_port DataFed core server port number.
    # @param server_pub_key_file DataFed core server public key file (full path).
    # @param server_cfg_dir DataFed core server configuration directory.
    # @param client_pub_key_file Client public key file (full path).
    # @param client_priv_key_file Client private key file (full path).
    # @param client_cfg_dir Client configuration directory.
    # @param manual_auth Client intends to manually authenticate if True. Bypasses client key loading.
    # @param kwargs Placeholder for any extra keyword arguments (ignored)
    # @exception Exception: On server key load error, timeout, or incompatible protocols.
    #
    # Attempts to create a secure connection with a specified DatFed
    # server. If key files are not specified, looks for default key
    # files in config directory, in specified, or, falls back to
    # "~/.datafed" directory. A server key must be found, but if
    # client keys cannot be found or loaded, an anonymous connection
    # is established. The keysLoaded(), keysValid(), and
    # getAuthStatus() methods may be used to assess status. Also
    #  checks client and server protocol versions for compatibility.
    #
    def __init__( self,
        server_host = None,
        server_port = None,
        server_pub_key_file = None,
        server_cfg_dir = None,
        client_pub_key_file = None,
        client_priv_key_file = None,
        client_cfg_dir = None,
        manual_auth = None,
        **kwargs
        ):
        self._ctxt = 0
        self._auth = False
        self._nack_except = True

        # Use or load server public key
        if server_pub_key_file != None:
            serv_pub = server_pub_key_file
        elif server_cfg_dir:
            serv_pub = os.path.join(str(server_cfg_dir), "datafed-core-key.pub")
        else:
            serv_pub = os.path.expanduser("~/.datafed/datafed-core-key.pub")

        try:
            keyf = open( serv_pub, "r" )
            serv_pub = keyf.read()
            keyf.close()
        except:
            raise Exception( "Could not open server public key file: " + serv_pub )

        # Process client cred dir
        self._client_cred_dir = client_cfg_dir

        # Use, load, or generate client keys
        self._keys_loaded = False
        self._keys_valid = False

        if manual_auth:
            pub,priv = zmq.curve_keypair()
            pub = pub.decode("utf-8")
            priv = priv.decode("utf-8")
        else:
            try:
                if client_pub_key_file:
                    keyf = open(client_pub_key_file, "r" )
                else:
                    keyf = open(os.path.join(str(self._client_cred_dir), "datafed-user-key.pub"), "r" )
                pub = keyf.read()
                keyf.close()

                if client_priv_key_file:
                    keyf = open(client_priv_key_file, "r" )
                else:
                    keyf = open(os.path.join(str(self._client_cred_dir), "datafed-user-key.priv"), "r" )
                priv = keyf.read()
                keyf.close()
                if len(pub) != 40 or len(priv) != 40:
                    pub,priv = zmq.curve_keypair()
                    pub = pub.decode("utf-8")
                    priv = priv.decode("utf-8")
                else:
                    self._keys_valid = True
                self._keys_loaded = True
            except:
                pub,priv = zmq.curve_keypair()
                pub = pub.decode("utf-8")
                priv = priv.decode("utf-8")

        self._conn = Connection.Connection( server_host, server_port, serv_pub, pub, priv )

        self._conn.registerProtocol(anon)
        self._conn.registerProtocol(auth)

        # Check for compatible protocol versions
        reply, mt = self.sendRecv(anon.VersionRequest(), 10000 )
        if reply == None:
            raise Exception( "Timeout waiting for server connection." )

        if reply.major != Version_pb2.VER_MAJOR or reply.minor != Version_pb2.VER_MINOR:
            raise Exception( "Incompatible server version {}.{}.{}".format(ver_reply.major,ver_reply.minor,ver_reply.build))

        # Check if server authenticated based on keys
        reply, mt = self.sendRecv( anon.GetAuthStatusRequest(), 10000 )
        self._auth = reply.auth
        self._uid = reply.uid


    ## @brief Determines if client security keys were loaded.
    #
    # @return True if keys were loaded; false otherwise.
    # @retval bool
    #
    def keysLoaded(self):
        return self._keys_loaded


    ## @brief Determines if loaded client security keys had a valid format.
    #
    # Note that keys with valid format but invalid value will cause
    # a connection failure (exception or timeout).
    #
    # @return True if client key formats were valid; false otherwise.
    # @retval bool
    #
    def keysValid(self):
        return self._keys_valid


    ## @brief Gets the client authentication status and user ID.
    #
    # @return A tuple of (bool,string) - The bool is True if client
    #    is authenticated; False otherwise. IF authenticated, the
    #    string part is the DataFed user ID of the client.
    # @retval (bool,str)
    #
    def getAuthStatus(self):
        return self._auth, self._uid


    ## @brief Perform manual client authentication with DataFed user ID and password.
    #
    # @param uid Client's DataFed user ID.
    # @param password Client's DataFed password.
    # @exception Exception: On communication timeout or authentication failure.
    #
    def manualAuth( self, uid, password ):
        msg = anon.AuthenticateRequest()
        msg.uid = uid
        msg.password = password
        self.sendRecv( msg )

        # Reset connection so server can re-authenticate
        self._conn.reset()

        # Test auth status
        reply, mt = self.sendRecv( anon.GetAuthStatusRequest() )
        if not reply.auth:
            raise Exception("Internal authentication error")
        self._auth = True
        self._uid = reply.uid


    ## @brief Get NackReply exception enable state.
    #
    # @return True if Nack exceptions are enabled; False otherwise.
    # @retval bool
    #
    def getNackExceptionEnabled( self ):
        return self._nack_except


    ## @brief Set NackReply exception enable state.
    #
    # If NackReply exceptions are enabled, any NackReply received by
    # the recv() or SendRecv() methods will be raised as an exception
    # containing the error message from the NackReply. When disabled,
    # NackReply messages are returned like any other reply.
    #
    # @param enabled: Sets exceptions to enabled (True) or disabled (False)
    #
    def setNackExceptionEnabled( self, enabled ):
        if enabled:
            self._nack_except = True
        else:
            self._nack_except = False


    ## @brief Synchronously send a message then receive a reply to/from DataFed server.
    #
    # @param msg: Protobuf message to send to the server
    #   timeout: Timeout in milliseconds
    # @return A tuple consisting of (reply, type), where reply is
    #   the received protobuf message reply and type is the
    #   corresponding message type/name (string) of the reply.
    #   On timeout, returns (None,None)
    # @retval (obj,str)
    # @exception Exception: On message context mismatch (out of sync)
    #
    def sendRecv( self, msg, timeout = 5000 ):
        self.send( msg )
        reply, mt, ctxt = self.recv( timeout )
        if reply == None:
            return None, None
        if ctxt != self._ctxt:
            raise Exception("Mismatched reply")
        return reply, mt


    ## @brief Asynchronously send a protobuf message to DataFed server.
    #
    # @param msg: Protobuf message to send to the server
    # @return Auto-generated message re-association context int
    #    value (match to context in subsequent reply).
    # @retval int
    #
    def send( self, msg ):
        self._ctxt += 1
        self._conn.send( msg, self._ctxt )
        return self._ctxt


    ## @brief Receive a protobuf message (reply) from DataFed server.
    #
    # @param timeout: Timeout in milliseconds (0 = don't wait, -1 =
    #   wait forever).
    # @exception Exception: On NackReply (if Nack exceptions enabled).
    # @return Tuple of (reply, type, context) where reply is the
    #   received protobuf message, type is the corresponding
    #   message type/name (string) of the reply, and context
    #   is the reassociation value (int). On timeout, returns
    #   (None,None,None).
    # @retval (obj,str,int)
    #
    def recv( self, timeout = 5000 ):
        reply, msg_type, ctxt = self._conn.recv( timeout )
        if reply == None:
            return None, None, None

        if msg_type == "NackReply" and self._nack_except:
            if reply.err_msg:
                raise Exception(reply.err_msg)
            else:
                raise Exception("Server error {}".format( reply.err_code ))

        return reply, msg_type, ctxt
