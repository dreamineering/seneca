/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha entity.test.js

var util   = require('util')

var seneca   = require('..')

var async   = require('async')
var gex     = require('gex')
var assert  = require('chai').assert


describe('entity', function(){

  it('parsecanon', function(){
    var si = seneca()
    function def(v,d){return void 0 == v ? d : v}
    function fmt(cn){ return def(cn.zone,'-')+'/'+def(cn.base,'-')+'/'+def(cn.name,'-') }

    assert.equal('-/-/n1',fmt(si.util.parsecanon('n1')))
    assert.equal('-/b1/n1',fmt(si.util.parsecanon('b1/n1')))
    assert.equal('z1/b1/n1',fmt(si.util.parsecanon('z1/b1/n1')))

    assert.equal('-/-/-',fmt(si.util.parsecanon('-')))
    assert.equal('-/-/-',fmt(si.util.parsecanon('-/-')))
    assert.equal('-/-/-',fmt(si.util.parsecanon('-/-/-')))
    assert.equal('-/-/0',fmt(si.util.parsecanon('0')))
    assert.equal('-/0/0',fmt(si.util.parsecanon('0/0')))
    assert.equal('0/0/0',fmt(si.util.parsecanon('0/0/0')))

    var fail
    try { si.util.parsecanon(''); fail = '' } catch(e) {}
    try { si.util.parsecanon('?'); fail = '?' } catch(e) {}
    assert.ok( void 0 == fail, fail )
  })


  it('make', function(){
    var si = seneca()

    var foo = si.make$('foo')
    assert.equal('-/-/foo',foo.entity$)
    assert.equal('-/-/foo',foo.canon$())
    assert.equal('-/-/foo',foo.canon$({string:true}))
    assert.equal('$-/-/foo',foo.canon$({string$:true}))
    assert.equal(',,foo',''+foo.canon$({array:true}))
    assert.equal(',,foo',''+foo.canon$({array$:true}))
    assert.equal("{ zone: undefined, base: undefined, name: 'foo' }",util.inspect(foo.canon$({object:true})))
    assert.equal("{ 'zone$': undefined, 'base$': undefined, 'name$': 'foo' }",util.inspect(foo.canon$({object$:true})))
    assert.equal(',,foo',''+foo.canon$({}))

    var b1_n1 = si.make$('b1/n1')
    assert.equal('-/b1/n1',b1_n1.entity$)
    var z1_b1_n1 = si.make$('z1/b1/n1')
    assert.equal('z1/b1/n1',z1_b1_n1.entity$)

    var pe = si.make({entity$:'-/-/a'})
    assert.equal('-/-/a',pe.entity$)
    pe = si.make({entity$:'-/b/a'})
    assert.equal('-/b/a',pe.entity$)
    pe = si.make({entity$:'c/b/a'})
    assert.equal('c/b/a',pe.entity$)

    var ap = si.make$('a',{x:1})
    assert.equal('-/-/a',ap.entity$)
    ap = si.make$('b','a',{x:1})
    assert.equal('-/b/a',ap.entity$)
    ap = si.make$('c','b','a',{x:1})
    assert.equal('c/b/a',ap.entity$)

    var esc1 = si.make$('esc',{x:1,y_$:2})
    assert.equal( esc1.toString(), '$-/-/esc:{id=;x=1;y=2}' )
  })

  
  it('mem-store-import-export', function(done){
    var si = seneca()


    // NOTE: zone is NOT saved! by design!

    var x1,x2,x3

    async.series([
      function(next){ si.make$('a',{x:1}).save$(function(e,o){x1=o;next()})},
      function(next){ si.make$('b','a',{x:2}).save$(function(e,o){x2=o;next()})},
      function(next){ si.make$('c','b','a',{x:3}).save$(function(e,o){x3=o;next()})},

      function(next){
        si.act('role:mem-store,cmd:dump',function(e,o){
          //console.dir(o)
          var t = gex('{"undefined":{"a":{"*":{"entity$":"-/-/a","x":1,"id":"*"}}},"b":{"a":{"*":{"entity$":"-/b/a","x":2,"id":"*"},"*":{"entity$":"c/b/a","x":3,"id":"*"}}}}').on(JSON.stringify(o))
          assert.ok(t)
          next(e)
        })
      },

      function(next){
        si.act('role:mem-store,cmd:export',{file:'mem.json'}, function(e){
          assert.isNull(e)

          var si2 = seneca()

          si2.act('role:mem-store,cmd:import',{file:'mem.json'}, function(e){
            assert.isNull(e)

            si2.act('role:mem-store,cmd:dump',function(e,o){
              assert.ok( gex('{"undefined":{"a":{"*":{"entity$":"-/-/a","x":1,"id":"*"}}},"b":{"a":{"*":{"entity$":"-/b/a","x":2,"id":"*"},"*":{"entity$":"c/b/a","x":3,"id":"*"}}}}').on(JSON.stringify(o)) )

              si2.make('a').load$({x:1},function(e,nx1){
                assert.equal('$-/-/a:{id='+x1.id+';x=1}',''+nx1)

                si2.make('a').load$({x:1},function(e,nx1){
                  assert.equal('$-/-/a:{id='+x1.id+';x=1}',''+nx1)

                  si2.make('b','a').load$({x:2},function(e,nx2){
                    assert.equal('$-/b/a:{id='+x2.id+';x=2}',''+nx2)

                    si2.make('c', 'b','a').load$({x:3},function(e,nx3){
                      assert.equal('$c/b/a:{id='+x3.id+';x=3}',''+nx3)
                      
                      next()
                    })
                  })
                })
              })
            })
          })
        })
      }

    ], function(err){
        done(err)
      }
    )
  })
})
