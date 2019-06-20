function dlgRepoEdit( a_repo_id, a_cb ){
    var content =
        "<div class='row-flex' style='height:100%'>\
            <div class='col-flex' style='flex:1 1 70%;height:100%'>\
                <div style='flex:none' class='ui-widget-header'>Configuration:</div>\
                <div style='flex:none'>\
                    <table style='width:100%'>\
                        <tr><td style='vertical-align:middle'>ID: <span class='note'>*</span></td><td><input type='text' id='id' style='width:100%' disabled></input></td></tr>\
                        <tr><td style='vertical-align:middle'>Title: <span class='note'>*</span></td><td><input type='text' id='title' style='width:100%'></input></td></tr>\
                        <tr><td style='vertical-align:top'>Description:</td><td><textarea id='desc' rows=3 style='width:100%;resize:none;padding:0'></textarea></td></tr>\
                        <tr><td style='vertical-align:top'>Srvr. Address: <span class='note'>*</span></td><td><input type='text' id='addr' style='width:100%'></input></td></tr>\
                        <tr><td style='vertical-align:top'>Public Key: <span class='note'>*</span></td><td><input type='text' id='pub_key' style='width:100%'></input></td></tr>\
                        <tr><td style='vertical-align:top'>End-point ID: <span class='note'>*</span></td><td><input type='text' id='ep_id' style='width:100%'></input></td></tr>\
                        <tr><td style='vertical-align:middle'>Path: <span class='note'>*</span></td><td><input type='text' id='path' style='width:100%'></input></td></tr>\
                        <tr><td style='vertical-align:middle'>Domain:</td><td><input type='text' id='domain' style='width:100%'></input></td></tr>\
                        <tr><td style='vertical-align:middle'>Export Path:</td><td><input type='text' id='exp_path' style='width:100%'></input></td></tr>\
                        <tr><td style='vertical-align:middle'>Capacity: <span class='note'>*</span></td><td><input type='text' id='capacity' style='width:100%'></input></td></tr>\
                    </table>\
                </div>\
                <div style='flex:none' class='ui-widget-header edit-only'>Statistics:</div>\
                <div style='flex:none' class='edit-only'>\
                    <table style='width:100%'>\
                        <tr><td style='vertical-align:middle'>Record&nbspCount:</td><td><input type='text' id='no_records' style='width:100%' disabled></input></td></tr>\
                        <tr><td style='vertical-align:middle'>File&nbspCount:</td><td><input type='text' id='no_files' style='width:100%' disabled></input></td></tr>\
                        <tr><td style='vertical-align:middle'>Capacity&nbspUsed:</td><td><input type='text' id='used' style='width:100%' disabled></input></td></tr>\
                    </table>\
                </div>\
            </div>\
            <div style='flex:none'>&nbsp</div>\
            <div class='col-flex' style='flex:1 1 30%;min-height:100%'>\
                <div style='flex:none' class='ui-widget-header'>Administrators: <span class='note'>*</span></div>\
                <div style='flex:1 1 40%;overflow:auto' class='ui-widget-content text'>\
                    <div id='admin_tree' class='no-border' style='min-height:0'></div>\
                </div>\
                <div style='flex:none;padding:.25em 0'>\
                    <button class='btn small' id='add_adm_btn'>Add</button>\
                    <button class='btn small' id='rem_adm_btn' disabled>Remove</button>\
                </div>\
                <div style='flex:none' class='ui-widget-header edit-only'>Allocations:</div>\
                <div style='flex:1 1 60%;overflow:auto' class='ui-widget-content text edit-only'>\
                    <div id='alloc_tree' class='no-border' style='min-height:0'></div>\
                </div>\
                <div style='flex:none;padding:.25em 0' class='edit-only'>\
                    <button class='btn small' id='add_alloc_btn'>Add</button>\
                    <button class='btn small' id='stat_alloc_btn' disabled>Stats</button>\
                    <button class='btn small' id='edit_alloc_btn' disabled>Edit</button>\
                    <button class='btn small' id='del_alloc_btn' disabled>Delete</button>\
                </div>\
            </div>\
        </div>";

    var frame = $(document.createElement('div'));
    var repo = null;
    var changed = 0;

    frame.html( content );

    inputTheme($('input',frame));
    inputTheme($('textarea',frame));

    function repoInputChanged( a_bit ){
        this.changed |= a_bit;
        $("#apply_btn").button("option","disabled",false);
    }

    function initForm(){
        if ( repo ){
            $("#id",frame).val(repo.id.substr(5));
            $("#title",frame).val(repo.title);
            $("#desc",frame).val(repo.desc);
            $("#addr",frame).val(repo.address);
            $("#pub_key",frame).val(repo.pubKey);
            $("#ep_id",frame).val(repo.endpoint);
            $("#domain",frame).val(repo.domain );
            $("#path",frame).val(repo.path );
            $("#exp_path",frame).val(repo.expPath );
            $("#capacity",frame).val(repo.capacity );
            var admin;
            for ( var i in repo.admin ){
                admin = repo.admin[i];
                admin_tree.rootNode.addNode({title:admin.substr(2),icon:"ui-icon ui-icon-person",key:admin});
            }
        }
    }

    function initStats( stats ){
        if ( stats ){
            $("#used",frame).val(sizeToString( stats.totalSz ));
            $("#no_records",frame).val(stats.records);
            $("#no_files",frame).val(stats.files);
        }
    }

    function initAlloc( alloc ){
        if ( alloc && alloc.length ){
            for ( var i in alloc ){
                addAllocNode( alloc[i] );
            }
        }
    }

    function addAllocNode( alloc ){
        alloc_tree.rootNode.addNode({title:alloc.id.substr(2) + "  (" +sizeToString(alloc.totSize) +"/"+sizeToString( alloc.maxSize )+")",icon:alloc.id.startsWith("u/")?"ui-icon ui-icon-person":"ui-icon ui-icon-box",key:alloc.id,alloc:alloc});
    }

    function updateAllocTitle( node ){
        node.setTitle( node.key.substr(2) + "  (" +sizeToString(node.data.alloc.totSize) +"/"+sizeToString( node.data.alloc.maxSize )+")");
    }

    $(".btn",frame).button();

    if ( a_repo_id ){
        $("#title",frame).on('input', function(){ repoInputChanged(1); });
        $("#desc",frame).on('input', function(){ repoInputChanged(2); });
        $("#domain",frame).on('input', function(){ repoInputChanged(4); });
        $("#capacity",frame).on('input', function(){ repoInputChanged(8); });
        $("#path",frame).on('input', function(){ repoInputChanged(0x10); });
        $("#exp_path",frame).on('input', function(){ repoInputChanged(0x20); });
        $("#pub_key",frame).on('input', function(){ repoInputChanged(0x40); });
        $("#addr",frame).on('input', function(){ repoInputChanged(0x80); });
        $("#ep_id",frame).on('input', function(){ repoInputChanged(0x100); });
    }

    $("#add_adm_btn",frame).click( function(){
        var excl = [];
        admin_tree.visit(function(node){
            //console.log("excl adm:",node.key);
            excl.push(node.key);
        });

        dlgPickUser( "u/"+g_user.uid, excl, false, function( uids ){
            console.log("sel:",uids);
            for ( i in uids ){
                uid = uids[i];
                admin_tree.rootNode.addNode({title: uid.substr(2),icon:"ui-icon ui-icon-person",key: uid });
            }
            repoInputChanged(16);
        });
    });

    $("#rem_adm_btn",frame).click( function(){
        var node = admin_tree.getActiveNode();
        if ( node ){
            node.remove();
            $("#rem_adm_btn",frame).button("option", "disabled", true);
        }
        repoInputChanged(0x200);
    });

    $("#add_alloc_btn",frame).click( function(){
        var excl = [];
        alloc_tree.visit(function(node){
            excl.push(node.key);
        });
        
        dlgAllocNewEdit.show( a_repo_id, null, excl, function( alloc ){
            console.log( "new alloc:", alloc );
            addAllocNode( alloc );
        });
    });

    $("#edit_alloc_btn",frame).click( function(){
        var node = alloc_tree.getActiveNode();
        if ( node ){
            dlgAllocNewEdit.show( a_repo_id, node.data.alloc, [], function( alloc ){
                console.log( "updated alloc:", alloc );
                node.data.alloc = alloc;
                updateAllocTitle( node );
            });
        }
    });

    $("#stat_alloc_btn",frame).click( function(){
        var node = alloc_tree.getActiveNode();
        if ( node ){
            allocStats( a_repo_id, node.key, function( ok, data ){
                if ( ok ){
                    //console.log("stats:",data);
                    // Update alloc tree with latest total_sz
                    node.data.alloc.totalSz = data.totalSz;
                    //node.setTitle( node.key.substr(2) + "  (" +sizeToString(data.totalSz) +"/"+sizeToString( node.data.alloc.alloc )+")");
                    updateAllocTitle( node );

                    var msg =
                    "<table class='info_table'>\
                    <tr><td>No. of Records:</td><td>" + data.records + "</td></tr>\
                    <tr><td>No. of Files:</td><td>" + data.files + "</td></tr>\
                    <tr><td>Total size:</td><td>" + sizeToString( data.totalSz ) + "</td></tr>\
                    <tr><td>Average size:</td><td>" + sizeToString( data.files>0?data.totalSz/data.files:0 ) + "</td></tr>\
                    </table><br>Histogram:<br><br><table class='info_table'>\
                    <tr><th></th><th>1's</th><th>10's</th><th>100's</th></tr>\
                    <tr><td>B:</td><td>" + data.histogram[0] + "</td><td>"+ data.histogram[1] + "</td><td>"+ data.histogram[2] + "</td></tr>\
                    <tr><td>KB:</td><td>" + data.histogram[3] + "</td><td>"+ data.histogram[4] + "</td><td>"+ data.histogram[5] + "</td></tr>\
                    <tr><td>MB:</td><td>" + data.histogram[6] + "</td><td>"+ data.histogram[7] + "</td><td>"+ data.histogram[8] + "</td></tr>\
                    <tr><td>GB:</td><td>" + data.histogram[9] + "</td><td>"+ data.histogram[10] + "</td><td>"+ data.histogram[11] + "</td></tr>\
                    <tr><td>TB:</td><td>" + data.histogram[12] + "</td></tr>\
                    </table>";

                    dlgAlert( "Allocation Statistics", msg );
                }
            });
        }
    });

    $("#del_alloc_btn",frame).click( function(){
        var node = alloc_tree.getActiveNode();
        if ( node ){
            dlgConfirmChoice("Confirm Delete", "Delete allocation for " + (node.key.startsWith("u/")?"user ":"project ") + node.key.substr(2) + "?", ["Delete","Cancel"], function( choice ){
                if ( choice == 0 ){
                    allocSet( a_repo_id, node.key, 0, 0, function( ok, data ){
                        if ( ok )
                            node.remove();
                        else
                            dlgAlert( "Allocation Delete Error", data );
                    });
                }
            });
        }
    });

    $("#admin_tree",frame).fancytree({
        extensions: ["themeroller"],
        themeroller: {
            activeClass: "ui-state-hover",
            addClass: "",
            focusClass: "",
            hoverClass: "ui-state-active",
            selectedClass: ""
        },
        source: [],
        selectMode: 1,
        activate: function( event, data ) {
            $("#rem_adm_btn",frame).button("option", "disabled", false);
        }
    });

    admin_tree = $("#admin_tree",frame).fancytree("getTree");

    $("#alloc_tree",frame).fancytree({
        extensions: ["themeroller"],
        themeroller: {
            activeClass: "ui-state-hover",
            addClass: "",
            focusClass: "",
            hoverClass: "ui-state-active",
            selectedClass: ""
        },
        source: [],
        selectMode: 1,
        activate: function( event, data ) {
            $("#stat_alloc_btn",frame).button("option", "disabled", false);
            $("#edit_alloc_btn",frame).button("option", "disabled", false);
            $("#del_alloc_btn",frame).button("option", "disabled", false);
        }
    });

    alloc_tree = $("#alloc_tree",frame).fancytree("getTree");

    if ( a_repo_id != null ){
        repoView( a_repo_id, function( ok, a_repo ){
            if ( ok && a_repo.length ){
                repo = a_repo[0];
                initForm();
            }
        });

        allocStats( a_repo_id, null, function( ok, stats ){
            if ( ok ){
                initStats( stats );
            }
        });

        allocList( a_repo_id, function( ok, alloc ){
            if ( ok ){
                initAlloc( alloc );
            }
        });
    }else{
        $("#stat_alloc_btn",frame).button("option", "disabled", true);
        $("#add_alloc_btn",frame).button("option", "disabled", true);
        $("#edit_alloc_btn",frame).button("option", "disabled", true);
        $("#del_alloc_btn",frame).button("option", "disabled", true);
        $("#id",frame).attr("disabled", false);
        $(".edit-only",frame).hide();
    }

    var options = {
        title: (a_repo_id?"Edit":"New") + " Data Repository",
        modal: true,
        width: 750,
        height: 'auto',
        resizable: true,
        closeOnEscape: true,
        buttons: [{
            id: 'apply_btn',
            text: a_repo_id?"Apply Changes":"Save",
            click: function() {
                if ( a_repo_id ){
                    //var title = (changed & 1)?$("#title",frame).val():null;
                    //var desc = (changed & 2)?$("#desc",frame).val():null;
                    //var domain = (changed & 4)?$("#domain",frame).val():null;
                    //var exp_path = (changed & 0x20)?$("#exp_path",frame).val():null;
                    //var capacity = (changed & 8)?parseSize( $("#capacity",frame).val() ):null;
                    //var address = (changed & 8)?$("#addr",frame).val():null;
                    //var pubKey = (changed & 8)?$("#pub_key",frame).val();
                    //var endpoint = (changed & 8)?$("#ep_id",frame).val();

                    var obj = {id:repo.id};
                    getUpdatedValue( $("#title",frame).val(), repo, obj, "title" );
                    getUpdatedValue( $("#desc",frame).val(), repo, obj, "desc" );
                    getUpdatedValue( $("#addr",frame).val(), repo, obj, "address" );
                    getUpdatedValue( $("#pub_key",frame).val(), repo, obj, "pubKey" );
                    getUpdatedValue( $("#ep_id",frame).val(), repo, obj, "endpoint" );
                    getUpdatedValue( $("#path",frame).val(), repo, obj, "path" );
                    getUpdatedValue( $("#domain",frame).val(), repo, obj, "domain" );
                    getUpdatedValue( $("#exp_path",frame).val(), repo, obj, "expPath" );

                    var cap = parseSize( $("#capacity",frame).val() );
                    if ( cap == null ){
                        dlgAlert("Data Entry Error","Invalid repo capacity value." );
                        return;
                    }
                    if ( cap != repo.capacity )
                        obj.capacity = cap;

                    var admins = [];
                    admin_tree.visit( function(node){
                        admins.push( node.key );
                    });

                    if ( admins.length == 0 ){
                        dlgAlert("Data Entry Error","Must specify at least one repo admin." );
                        return;
                    }

                    if ( admins.length != repo.admin.length )
                        obj.admin = admins;
                    else{
                        for ( var i in admins ){
                            if ( admins[i] != repo.admin[i] ){
                                obj.admin = admins;
                                break;
                            }
                        }
                    }

                    console.log("repo update:",obj);

                    repoUpdate( obj, function( ok, data ){
                        if ( ok ){
                            changed = 0;
                            $("#apply_btn").button("option", "disabled", true);
                        }else{
                            dlgAlert( "Repo Update Failed", data );
                        }
                    });
                }else{
                    var obj = {
                        id: $("#id",frame).val(),
                        title: $("#title",frame).val(),
                        address: $("#addr",frame).val(),
                        pubKey: $("#pub_key",frame).val(),
                        endpoint: $("#ep_id",frame).val(),
                        path: $("#path",frame).val()
                    };

                    var tmp = $("#desc",frame).val().trim();
                    if ( tmp )
                        obj.desc = tmp;
                    tmp = $("#domain",frame).val().trim();
                    if ( tmp )
                        obj.domain = tmp;
                    tmp = $("#exp_path",frame).val().trim();
                    if ( tmp )
                        obj.exp_path = tmp;

                    var cap = parseSize( $("#capacity",frame).val() );
                    if ( cap == null ){
                        dlgAlert("Data Entry Error","Invalid repo capacity value." );
                        return;
                    }
                    obj.capacity = cap;

                    obj.admin = [];
                    admin_tree.visit( function(node){
                        obj.admin.push( node.key );
                    });

                    if ( obj.admin.length == 0 ){
                        dlgAlert("Data Entry Error","Must specify at least one repo admin." );
                        return;
                    }

                    console.log("repo create:",obj);

                    repoCreate( obj, function( ok, data ){
                        if ( ok ){
                            if (a_cb) a_cb();
                            $(this).dialog('destroy').remove();
                        }else{
                            dlgAlert( "Repo Create Failed", data );
                        }
                    });
                }
            }
        },{
            text: a_repo_id?"Close":"Cancel",
            click: function() {
                if ( a_repo_id && a_cb )
                    a_cb();
                $(this).dialog('destroy').remove();
            }
        }],
        open: function(event,ui){
            if ( a_repo_id ){
                $("#apply_btn").button("option", "disabled", true);
            }
            var widget = frame.dialog( "widget" );
            $(".ui-dialog-buttonpane",widget).append("<span class='note' style='padding:1em;line-height:200%'>* Required fields</span>");
        }
    };

    frame.dialog( options );

}