import * as settings from "./settings.js";
import * as util from "./util.js";

var tree,sel_tree;

window.userPageLoad = function( key, offset ){
    var node = tree.getNodeByKey( key );
    if ( node ){
        node.data.offset = offset;
        setTimeout(function(){
            node.load(true);
        },0);
    }
};


export function show(  a_uid, a_excl, a_single_sel, cb ){
    var frame = $(document.createElement('div'));

    frame.html(
        "<div class='col-flex' style='height:100%'>\
            <div style='flex:none;padding:0 0 .5em 0;align-items: center' class='row-flex'><div style='flex:none'>Search:&nbsp</div><div style='flex:1 1 auto'><input id='search_input' type='text' style='width:100%;box-sizing:border-box'></input></div></div>\
            <div style='flex:3 3 75%;overflow:auto;padding:0' class='ui-widget-content text'>\
                <div id='user_tree' class='no-border'></div>\
            </div>\
            <div style='flex:none;padding:0.5em 0 .25em 0' class='row-flex'><div style='flex:1 1 auto'>Selection:</div><div style='flex:none'><button id='sel_rem' class='btn small'>Remove</button></div></div>\
            <div style='flex:1 1 25%;overflow:auto;padding:0' class='ui-widget-content text'>\
                <div id='sel_tree' class='no-border'></div>\
            </div>\
        </div>" );

    var sel_users = {};

    var options = {
        title: "Select User" + (a_single_sel?"":"(s)"),
        modal: true,
        width: 450,
        height: 500,
        resizable: true,
        buttons: [{
            text: "Cancel",
            click: function() {
                $(this).dialog('close');
            }
        },{
            id:"ok_btn",
            text: "Ok",
            click: function() {
                cb( Object.keys( sel_users ));
                $(this).dialog('close');
            }
        }],
        open: function(event,ui){
            $(".btn",frame).button();
            $("#ok_btn").button("disable");
            $("#sel_rem").button("disable");
        },
        close: function( ev, ui ) {
            $(this).dialog("destroy").remove();
        }
    };

    util.inputTheme( $('input:text', frame ));
    var search_input = $("#search_input",frame);

    var src = [
        {title:"Collaborators",icon:"ui-icon ui-icon-folder",folder:true,lazy:true,unselectable:true,key:"collab"},
        {title:"By Groups",icon:"ui-icon ui-icon-folder",folder:true,lazy:true,unselectable:true,key:"groups"},
        {title:"All",icon:"ui-icon ui-icon-folder",folder:true,lazy:true,unselectable:true,key:"all",offset:0},
        {title:"Search Results",icon:"ui-icon ui-icon-folder",folder:true,lazy:true,unselectable:true,key:"search",offset:0}
    ];

    $("#user_tree",frame).fancytree({
        extensions: ["themeroller"],
        themeroller: {
            activeClass: "my-fancytree-active",
            addClass: "",
            focusClass: "",
            hoverClass: "my-fancytree-hover",
            selectedClass: ""
        },
        source: src,
        nodata: false,
        selectMode: a_single_sel?1:2,
        select: function( ev, data ){
            //var idx = sel_users.indexOf( data.node.key );
            if ( data.node.isSelected()){
                if ( !(data.node.key in sel_users )){
                    sel_users[data.node.key] = data.node.title;
                    tree.visit( function( vnode ){
                        if ( vnode.key == data.node.key )
                            vnode.setSelected( true );
                    });
                }
            }else{
                if ( data.node.key in sel_users ){
                    delete sel_users[data.node.key];

                    tree.visit( function( vnode ){
                        if ( vnode.key == data.node.key )
                            vnode.setSelected( false );
                    });
                }
            }

            updateSelectionTree();
        },
        checkbox: false,
        click: function( ev, data ) {
            if ( data.node.isSelected() )
                data.node.setSelected( false );
            else
                data.node.setSelected( true );
        },
        lazyLoad: function( ev, data ) {
            if ( data.node.key == "collab" ) {
                data.result = {
                    url: "/api/usr/list/collab?offset="+data.node.data.offset+"&count="+settings.opts.page_sz,
                    cache: false
                };
            } else if ( data.node.key == "groups" ) {
                data.result = {
                    url: "/api/grp/list?uid="+a_uid,
                    cache: false
                };
            } else if ( data.node.key == "all" ) {
                data.result = {
                    url: "/api/usr/list/all?offset="+data.node.data.offset+"&count="+settings.opts.page_sz,
                    cache: false
                };
            } else if ( data.node.key == "search" ) {
                var srch_val = search_input.val().trim();
                if ( srch_val.length > 1 ){
                    data.result = {
                        url: "/api/usr/find/by_name_uid?name_uid="+encodeURIComponent(srch_val)+"&offset="+data.node.data.offset+"&count="+settings.opts.page_sz,
                        cache: false
                    };
                }else{
                    data.result = [];
                }
            } else if ( data.node.key.startsWith("g/")){
                data.result = {
                    url: "/api/grp/view?uid="+encodeURIComponent(a_uid)+"&gid="+encodeURIComponent(data.node.key.substr(2)),
                    cache: false
                };
            }
        },
        postProcess: function( ev, a_data ) {
            var i;

            if ( a_data.node.key == "collab" || a_data.node.key == "all" || a_data.node.key == "search" ){
                a_data.result = [];
                if ( a_data.response.offset > 0 || a_data.response.total > (a_data.response.offset + a_data.response.count )){
                    var pages = Math.ceil(a_data.response.total/settings.opts.page_sz), page = 1+a_data.response.offset/settings.opts.page_sz;
                    a_data.result.push({title:"<button class='btn btn-icon-tiny''"+(page==1?" disabled":"")+" onclick='userPageLoad(\"" +
                        a_data.node.key+"\",0)'><span class='ui-icon ui-icon-triangle-1-w-stop'></span></button> <button class='btn btn-icon-tiny'"+(page==1?" disabled":"") +
                        " onclick='userPageLoad(\""+a_data.node.key+"\","+(page-2)*settings.opts.page_sz+")'><span class='ui-icon ui-icon-triangle-1-w'></span></button> Page " +
                        page + " of " + pages + " <button class='btn btn-icon-tiny'"+(page==pages?" disabled":"")+" onclick='userPageLoad(\"" +
                        a_data.node.key+"\","+page*settings.opts.page_sz+")'><span class='ui-icon ui-icon-triangle-1-e'></span></button> <button class='btn btn-icon-tiny'" + 
                        (page==pages?" disabled":"")+" onclick='userPageLoad(\""+a_data.node.key+"\","+(pages-1)*settings.opts.page_sz +
                        ")'><span class='ui-icon ui-icon-triangle-1-e-stop'></span></button>", folder:false, icon:false, unselectable:true, hasBtn:true });
                }

                var user,unsel;
                for ( i in a_data.response.user ) {
                    user = a_data.response.user[i];
                    unsel = (a_excl.indexOf( user.uid ) != -1);
                    a_data.result.push({ title: (unsel?"<span style='color:#808080'>":"") + user.nameLast + ", " + user.nameFirst + " ("+user.uid.substr(2) +")" + (unsel?"</span>":""),icon:"ui-icon ui-icon-person",key: user.uid,unselectable:unsel, selected: user.uid in sel_users });
                }

            } else if ( a_data.node.key == "groups" ){
                a_data.result = [];
                var group;
                for ( i in a_data.response ) {
                    group = a_data.response[i];
                    if ( a_excl.indexOf( "g/"+group.gid ) == -1 )
                        a_data.result.push({ title: group.title + " ("+group.gid +")",icon:"ui-icon ui-icon-persons",unselectable:true,folder:true,lazy:true,key:"g/"+group.gid });
                }
            } else if ( a_data.node.key.startsWith("g/")){
                a_data.result = [];
                var mem;
                for ( i in a_data.response.member ) {
                    mem = a_data.response.member[i];
                    if ( a_excl.indexOf( mem ) == -1 )
                        a_data.result.push({ title: mem.substr(2),icon:"ui-icon ui-icon-person",key:mem});
                }
            }
        },
        collapse: function( event, data ) {
            if ( data.node.isLazy() ){
                data.node.resetLazy();
            }
        },
        renderNode: function(ev,data){
            if ( data.node.data.hasBtn ){
                $(".btn",data.node.li).button();
            }
        },
    });

    tree = $.ui.fancytree.getTree($("#user_tree",frame));

    $("#sel_tree",frame).fancytree({
        extensions: ["themeroller"],
        themeroller: {
            activeClass: "my-fancytree-active",
            addClass: "",
            focusClass: "",
            hoverClass: "my-fancytree-hover",
            selectedClass: ""
        },
        source: [],
        nodata: false,
        icon: false,
        selectMode: 2,
        checkbox: false,
        select: function(){
            if ( sel_tree.getSelectedNodes().length )
                $("#sel_rem",frame).button("enable");
            else
                $("#sel_rem",frame).button("disable");
        },
        click: function( ev, data ) {
            if ( data.node.isSelected() )
                data.node.setSelected( false );
            else
                data.node.setSelected( true );
        },
    });

    sel_tree = $.ui.fancytree.getTree($("#sel_tree",frame));

    function updateSelectionTree(){
        var src = [];
        for ( var i in sel_users ){
            src.push({ title: sel_users[i],icon:"ui-icon ui-icon-person", key: i });
        }

        sel_tree.reload( src );
        $("#sel_rem",frame).button("disable");

        if ( Object.keys(sel_users).length ){
            $("#ok_btn").button("enable");
        }else{
            $("#ok_btn").button("disable");
        }
    }

    var in_timer;

    search_input.on( "input", function(e) {
        if ( in_timer )
            clearTimeout( in_timer );

        in_timer = setTimeout( function(){
            var node = tree.getNodeByKey("search");
            node.load(true).done( function(){ node.setExpanded(true); });
        }, 500 );
    });

    $("#sel_rem",frame).on("click",function(){
        var nodes = sel_tree.getSelectedNodes();
        for ( var i in nodes ){
            delete sel_users[nodes[i].key];
            tree.visit( function( vnode ){
                if ( vnode.key == nodes[i].key )
                    vnode.setSelected( false );
            });
        }

        updateSelectionTree();
    });

    frame.dialog( options );
}

