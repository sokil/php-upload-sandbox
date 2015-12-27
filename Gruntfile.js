module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        copy: {
            bower: {
                expand: true,
                flatten: true,
                src: [
                    'frontend/dist/upload.js'
                ],
                dest: 'public/js/'
            }
        },
        watch: {
            js: {
                files: [
                    'frontend/dist/*'
                ],
                tasks: ['build'],
                options: {},
            },
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('build', [
        'copy'
    ]);

    grunt.registerTask('rebuild', [
        'watch'
    ]);

    grunt.registerTask('default', [
        'build'
    ]);
};